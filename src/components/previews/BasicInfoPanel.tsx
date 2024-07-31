import {FC} from "react";
import {OdFileObject} from "../../types";
import {PreviewContainer} from "./Containers";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {formatModifiedDateTime, humanFileSize} from "../../utils/fileDetails";
import {getFileIcon} from "../../utils/getFileIcon";
import {useTranslation} from "react-i18next";


const BasicInfoPanel: FC<{ file: OdFileObject, hashedToken?: string }> = ({file, hashedToken}) => {
    const {t} = useTranslation()
    return (
        <div className="!mb-4">
            <PreviewContainer>
                <div className="items-center px-5 py-4 md:flex md:space-x-8">
                    <div
                        className="rounded-lg border border-gray-900/10 px-8 py-20 text-center dark:border-gray-500/30">
                        {file.protected ? (<FontAwesomeIcon icon={['fas', 'lock']}/>) : (
                            <FontAwesomeIcon icon={getFileIcon(file.name, {video: Boolean(file.video)})}/>)}
                        <div className="mt-6 text-sm font-medium line-clamp-3 md:w-28 break-all">{file.name}</div>
                    </div>

                    <div className="flex flex-col space-y-2 py-4 md:flex-1">
                        <div>
                            <div className="py-2 text-xs font-medium uppercase opacity-80">{t('Last modified')}</div>
                            <div>{formatModifiedDateTime(file.lastModifiedDateTime)}</div>
                        </div>

                        <div>
                            <div className="py-2 text-xs font-medium uppercase opacity-80">{t('File size')}</div>
                            <div>{humanFileSize(file.size)}</div>
                        </div>

                        <div>
                            <div className="py-2 text-xs font-medium uppercase opacity-80">{t('MIME type')}</div>
                            <div>{file.file?.mimeType ?? t('Unavailable')}</div>
                        </div>

                        <div>
                            <div className="py-2 text-xs font-medium uppercase opacity-80">{t('Hashes')}</div>
                            <table className="block w-full overflow-scroll whitespace-nowrap text-sm md:table">
                                <tbody>
                                <tr className="border-y bg-white dark:border-gray-700 dark:bg-gray-900">
                                    <td className="bg-gray-50 py-1 px-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                        Quick XOR
                                    </td>
                                    <td className="whitespace-nowrap py-1 px-3 font-mono text-gray-500 dark:text-gray-400">
                                        {file.file.hashes?.quickXorHash ?? t('Unavailable')}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </PreviewContainer>
        </div>
    )
}

export default BasicInfoPanel
