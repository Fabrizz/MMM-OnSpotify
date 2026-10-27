import { ArrowRightLeft } from 'lucide-react'
import fb from '@/assets/fblogo.png'
import lg from '@/assets/icon.png'
import gh from '@/assets/ghl.png'

export function SiteHeader() {
  return (
    <div className='flex justify-between gap-4 mb-5 mt-3 border-b border-border pb-3'>
      <div className='flex items-center'>
        <a href='https://onsp.fabriziob.com' className='rounded-xl flex flex-row items-center gap-2 pl-2 pr-2 z-10 hover:bg-white/10 transition-all h-10'>
          <img src={lg} alt="" className='h-7 w-auto object-contain aspect-[2/1] rounded-md' />
        </a>
        <a href='/my' className='rounded-xl text-sm flex flex-row items-center gap-2 px-2 z-10 hover:bg-white/10 transition-all h-10'>
          <span className='h-7 border rounded-md flex gap-1.5 items-center px-2'>
            <ArrowRightLeft className='size-4' />
            <span>Authentication Handoff</span>
          </span>
        </a>
      </div>

      <div className='flex items-center'>
        <a href='https://github.com/Fabrizz/MMM-OnSpotify' className='rounded-xl flex flex-row items-center gap-2 pl-2 pr-2 z-10 hover:bg-white/10 transition-all h-10'>
          <img src={gh} alt="" className='h-7 w-7 rounded-md' />
        </a>
        <a href='https://fabriziob.com' className='rounded-xl flex flex-row items-center gap-2 pl-2 pr-2 z-10 hover:bg-white/10 transition-all h-10'>
          <img src={fb} alt="" className='size-7' />
        </a>
      </div>
    </div>
  )
}
