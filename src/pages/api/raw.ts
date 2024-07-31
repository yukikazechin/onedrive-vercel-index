import {posix as pathPosix} from 'path'

import type {NextApiRequest, NextApiResponse} from 'next'
import axios, {AxiosResponseHeaders} from 'axios'
import Cors from 'cors'

import {driveApi, cacheControlHeader} from '../../../config/api.config'
import {encodePath, getAccessToken, checkAuthRoute} from '.'
import {Session} from "../../utils/odAuthTokenStore";
import {compareHashedToken} from "../../utils/protectedRouteHandler";
import {now} from "../../utils/loggerHelper";

// CORS middleware for raw links: https://nextjs.org/docs/api-routes/api-middlewares
export function runCorsMiddleware(req: NextApiRequest, res: NextApiResponse) {
    const cors = Cors({methods: ['GET', 'HEAD']})
    return new Promise((resolve, reject) => {
        cors(req, res, result => {
            if (result instanceof Error) {
                return reject(result)
            }

            return resolve(result)
        })
    })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const sessionManager = new Session(req, res);
    const session = await sessionManager.getSession();

    const accessToken = await getAccessToken()
    if (!accessToken) {
        res.status(403).json({error: 'No access token.'})
        return
    }

    const {path = '/', odpt = '', proxy = false} = req.query

    // Sometimes the path parameter is defaulted to '[...path]' which we need to handle
    if (path === '[...path]') {
        res.status(400).json({error: 'No path specified.'})
        return
    }
    // If the path is not a valid path, return 400
    if (typeof path !== 'string') {
        res.status(400).json({error: 'Path query invalid.'})
        return
    }
    const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path))

    // Handle protected routes authentication
    const odTokenHeader = (req.headers['od-protected-token'] as string) ?? odpt

    const {code, message, authPath, needAuth, password} = await checkAuthRoute(cleanPath, accessToken, '')
    // Status code other than 200 means user has not authenticated yet
    if (code != 401 && code !== 200) {
        res.status(code).json({error: message})
        return
    }

    // If message is empty, then the path is not protected.
    // Conversely, protected routes are not allowed to serve from cache.
    if (message !== '') {
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('X-Need-NoCache', 'yes')  // Add an extra header
    }

    await runCorsMiddleware(req, res)
    try {
        console.info(`[${now()}][${needAuth ? 'PRIVATE' : 'PUBLIC'}][Path:${cleanPath}][Proxy: ${proxy}][ODPT: ${odTokenHeader ? 'YES' : 'NO'}] Download File.`)
        // Handle response from OneDrive API
        const requestUrl = `${driveApi}/root${encodePath(cleanPath)}`
        const {data} = await axios.get(requestUrl, {
            headers: {Authorization: `Bearer ${accessToken}`},
            params: {
                // OneDrive international version fails when only selecting the downloadUrl (what a stupid bug)
                select: 'id,name,size,@microsoft.graph.downloadUrl',
            },
        })

        let checkPass = false;

        if (needAuth && password) {
            // Check odpt
            if (compareHashedToken({
                odTokenHeader,
                dotPassword: password,
                fileId: data.id,
            })) {
                checkPass = true;
            }

            // Check user session
            const passKeys = session?.passKeys ?? {};
            const passKey = passKeys[authPath ?? ''] ?? '';
            if (password === passKey && passKey) {
                checkPass = true;
            }
        }

        if (needAuth && !checkPass) {
            res.status(401).json({error: 'Not authenticated.'})
            return
        }

        // For security reasons, .password files cant be downloaded.
        if (data?.name === '.password') {
            res.status(403).json({error: 'For security reasons, this file can\'t be downloaded.'})
            return
        }

        if ('@microsoft.graph.downloadUrl' in data) {
            // Only proxy raw file content response for files up to 4MB
            if (proxy && 'size' in data && data['size'] < 4194304) {
                const {headers, data: stream} = await axios.get(data['@microsoft.graph.downloadUrl'] as string, {
                    responseType: 'stream',
                })
                headers['Cache-Control'] = cacheControlHeader
                // If already has attachment header in response, don't overwrite it
                headers['Content-Disposition'] = res.getHeader('content-disposition') ?? `attachment; filename="${data['name']}"` as string
                // Send data stream as response
                res.writeHead(200, headers as AxiosResponseHeaders)
                stream.pipe(res)
            } else {
                // Redirect to download url
                res.redirect(302, data['@microsoft.graph.downloadUrl'] as string)
            }
        } else {
            res.status(404).json({error: 'No download url found.'})
        }
        return
    } catch (error: any) {
        res.status(error?.response?.status ?? 500).json({error: error?.response?.data?.error ?? 'Internal server error.'})
        return
    }
}
