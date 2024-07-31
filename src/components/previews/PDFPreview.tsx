import {useRouter} from 'next/router'
import {getBaseUrl} from '../../utils/getBaseUrl'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import {DownloadBtnContainer} from './Containers'
import BasicInfoPanel from './BasicInfoPanel'
import {FC} from "react";

const PDFEmbedPreview: FC<{ file: any, hashedToken?: string }> = ({file, hashedToken}) => {
    const {asPath} = useRouter()

    const pdfPath = encodeURIComponent(
        `${getBaseUrl()}/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`
    )
    const url = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${pdfPath}`

    return (
        <>
            <BasicInfoPanel file={file}></BasicInfoPanel>

            <div
                className="w-full overflow-hidden border-t border-gray-900/10 bg-white bg-opacity-80 p-2 shadow-sm backdrop-blur-md dark:border-gray-500/30 dark:bg-gray-900 rounded backdrop-blur-md !bg-opacity-50"
                style={{height: '90vh'}}>
                <iframe src={url} frameBorder="0" width="100%" height="100%"></iframe>
            </div>

            <DownloadBtnContainer>
                <DownloadButtonGroup hashedToken={hashedToken}/>
            </DownloadBtnContainer>

        </>
    )
}

export default PDFEmbedPreview
