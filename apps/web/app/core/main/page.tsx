// @ts-nocheck
'use client'
import dynamic from 'next/dynamic'

const MainPage = dynamic(() => import('./page-content'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>,
})

export default MainPage
