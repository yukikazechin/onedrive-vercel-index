import type {OdThumbnail} from '../../types'

import {posix as pathPosix} from 'path'

import axios from 'axios'
import type {NextApiRequest, NextApiResponse} from 'next'

import {checkAuthRoute, encodePath, getAccessToken} from '.'
import apiConfig from '../../../config/api.config'
import {Session} from "../../utils/odAuthTokenStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const sessionManager = new Session(req, res);
    const session = await sessionManager.getSession();
    const passKeys = session?.passKeys ?? {};

    const accessToken = await getAccessToken()
    if (!accessToken) {
        res.status(403).json({error: 'No access token.'})
        return
    }

    // Get item thumbnails by its path since we will later check if it is protected
    const {path = '', size = 'medium'} = req.query

    // Check whether the size is valid - must be one of 'large', 'medium', or 'small'
    if (size !== 'large' && size !== 'medium' && size !== 'small') {
        res.status(400).json({error: 'Invalid size'})
        return
    }
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

    // Path shoudn't cotain :
    if (cleanPath.includes(':')) {
        res.status(400).json({error: 'Path invalid.'})
        return
    }

    const {code, message, password, authPath} = await checkAuthRoute(cleanPath, accessToken, '')
    // Status code other than 200 means user has not authenticated yet
    if (code !== 200) {
        if (code !== 401) {
            res.status(code).json({error: message})
            return
        }
        // Check user session
        const passKey = passKeys[authPath ?? ''] ?? '';
        if (!passKey) {
            res.status(401).json({error: message})
            return
        }
        if (password !== passKey) {
            res.status(401).json({error: 'Password incorrect.'})
            return
        }
    }

    // If message is empty, then the path is not protected.
    // Conversely, protected routes are not allowed to serve from cache.
    if (message !== '') {
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('X-Need-NoCache', 'yes')  // Add an extra header
    }

    const requestPath = encodePath(cleanPath)
    // Handle response from OneDrive API
    const requestUrl = `${apiConfig.driveApi}/root${requestPath}`
    // Whether path is root, which requires some special treatment
    const isRoot = requestPath === ''

    try {
        const {thumbnails: data, name: filename} = await axios.get(`${requestUrl}${isRoot ? '' : ':'}`, {
            headers: {Authorization: `Bearer ${accessToken}`},
            params: {
                select: 'name',
                expand: 'thumbnails'
            },
        }).then(res => res.data)

        if (filename === '.password') {
            res.status(400).json({error: 'The item is protected.'})
            return
        }

        const thumbnailUrl = data && data.length > 0 ? (data[0] as OdThumbnail)[size].url : null
        if (thumbnailUrl) {
            res.redirect(thumbnailUrl)
        } else {
            res.status(400).json({error: "The item doesn't have a valid thumbnail."})
        }
    } catch (error: any) {
        res.status(error?.response?.status).json({error: error?.response?.data?.error ?? 'Internal server error.'})
    }
    return
}
