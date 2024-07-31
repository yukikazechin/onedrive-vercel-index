import Head from 'next/head'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'

import siteConfig from '../../config/site.config'
import Navbar from '../components/Navbar'
import FileListing from '../components/FileListing'
import Footer from '../components/Footer'
import Breadcrumb from '../components/Breadcrumb'
import SwitchLayout from '../components/SwitchLayout'
import getBuildId, {isFirstTimeRun} from '../utils/buildIdHelper'
import {getFileList} from "./api";

export default function Home({build_id, renderedData}) {
    return (
        <div
            className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900 !bg-opacity-80">
            <Head>
                <title>{siteConfig.title}</title>
            </Head>

            <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800 !bg-opacity-50">
                <Navbar/>
                <div className="mx-auto w-full max-w-5xl py-4 sm:p-4 !bg-opacity-50">
                    <nav className="mb-4 flex items-center justify-between px-4 sm:px-0 sm:pl-1">
                        <Breadcrumb/>
                        <SwitchLayout/>
                    </nav>
                    <FileListing renderedData={renderedData}/>
                </div>
            </main>

            <Footer BuildId={build_id}/>
        </div>
    )
}


export async function getStaticProps({locale}) {
    return {
        props: {
            build_id: getBuildId(),
            renderedData: await getFileList({path: '/'}),
            ...(await serverSideTranslations(locale, ['common'])),
        },
        revalidate: isFirstTimeRun() ? 1 : siteConfig.cacheMaxAge,
    }
}
