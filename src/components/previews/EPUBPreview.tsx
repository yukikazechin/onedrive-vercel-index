import type {OdFileObject} from '../../types'

import {FC, useEffect, useRef, useState} from 'react'
import {ReactReader} from 'react-reader'
import {useRouter} from 'next/router'
import {useTranslation} from 'next-i18next'

import Loading from '../Loading'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import {DownloadBtnContainer} from './Containers'
import BasicInfoPanel from './BasicInfoPanel'

const EPUBPreview: FC<{ file: OdFileObject, hashedToken?: string }> = ({file, hashedToken}) => {
    const {asPath} = useRouter()

    const [epubContainerWidth, setEpubContainerWidth] = useState(400)
    const epubContainer = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setEpubContainerWidth(epubContainer.current ? epubContainer.current.offsetWidth : 400)
    }, [])

    const [location, setLocation] = useState<string>()
    const onLocationChange = (cfiStr: string) => setLocation(cfiStr)

    const {t} = useTranslation()

    // Fix for not valid epub files according to
    // https://github.com/gerhardsletten/react-reader/issues/33#issuecomment-673964947
    const fixEpub = rendition => {
        const spineGet = rendition.book.spine.get.bind(rendition.book.spine)
        rendition.book.spine.get = function (target: string) {
            const targetStr = target as string
            let t = spineGet(target)
            while (t == null && targetStr.startsWith('../')) {
                target = targetStr.substring(3)
                t = spineGet(target)
            }
            return t
        }
    }

    return (
        <div>
            <BasicInfoPanel file={file}></BasicInfoPanel>
            <div
                className="no-scrollbar flex w-full flex-col overflow-scroll rounded bg-white dark:bg-gray-900 md:p-3 border-t border-gray-900/10 dark:border-gray-500/30 backdrop-blur-md !bg-opacity-50"
                style={{maxHeight: '90vh'}}
            >
                <div className="no-scrollbar w-full flex-1 overflow-scroll" ref={epubContainer}
                     style={{minHeight: '70vh'}}>
                    <div
                        style={{
                            position: 'absolute',
                            width: epubContainerWidth,
                            height: '70vh',
                        }}
                    >
                        <ReactReader
                            url={`/api/raw/?path=${asPath}${hashedToken ? '&odpt=' + hashedToken : ''}`}
                            getRendition={rendition => fixEpub(rendition)}
                            loadingView={<Loading loadingText={t('Loading EPUB ...')}/>}
                            location={location}
                            locationChanged={onLocationChange}
                            epubInitOptions={{openAs: 'epub'}}
                            epubOptions={{flow: 'scrolled', allowPopups: true}}
                        />
                    </div>
                </div>
            </div>
            <DownloadBtnContainer>
                <DownloadButtonGroup hashedToken={hashedToken}/>
            </DownloadBtnContainer>
        </div>
    )
}

export default EPUBPreview
