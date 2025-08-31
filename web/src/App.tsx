import fb from './assets/fblogo.png'
import lg from './assets/icon.png'
import bn from './assets/banner.png'
import gh from './assets/ghl.png'
import { KeyRoundIcon, LayoutGrid, Link, ShieldUser, Stethoscope, Trash2Icon } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion'
import { Badge } from './components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import Auth from './components/Auth'

function App() {

  return (
    <main className="flex flex-col justify-center max-w-3xl mx-auto px-2 pb-50">
      <div className='flex justify-between gap-4 mb-5 mt-3 border-b border-border pb-3'>
        <a href='https://fabriz.co' className='rounded-xl flex flex-row items-center gap-2 pl-2.5 pr-3.5 z-10 hover:bg-white/10 transition-all h-12'>
          <img src={fb} alt="" className='size-7' />
          <span className='hidden md:inline'>FABRIZZ</span>
        </a>
        <a href='https://github.com/Fabrizz/MMM-OnSpotify' className='rounded-xl flex flex-row items-center gap-2 pl-3 pr-3 z-10 hover:bg-white/10 transition-all h-12'>
          <img src={gh} alt="" className='h-7 rounded-md' />
          <img src={lg} alt="" className='h-7 rounded-md' />
        </a>
      </div>

      <div className='mb-8 text-center'>
        <h1 className='leading-11 font-sans text-3xl font-normal '>MMM-OnSpotify</h1>
        <p className='leading-6 text-lg font-sans font-thin'>A MagicMirror² module that displays what you are listening to using the Spotify Connect API.</p>
      </div>

      <div className='mb-4 pb-8 border-b border-border'>
        <img src={bn} alt="" className='mb-8' />
        <a href='https://github.com/Fabrizz/MMM-OnSpotify' className='rounded-xl border border-border hover:scale-[1.01] active:scale-[0.99] flex flex-row items-center gap-2 pl-3 pr-3 z-10 hover:bg-green-300/10 transition-all h-12 opacity-90 hover:opacity-100 hover:border-transparent'>
          <img src={gh} alt="" className='h-7 rounded-md' />
          <span className='font-thin flex-1'>View in Github</span>
          <Link className='size-4 mr-1' />
        </a>
      </div >

      <h1 className='leading-11 font-sans text-3xl font-normal mb-6'>
        Configuring the module
      </h1>

      <h2 className='leading-11 font-sans text-xl font-normal mb-1'>
        <span className='flex gap-1.5 items-center -mb-1'>
          <span className='bg-white border border-white rounded-full size-2.5'></span>
          <span className='bg-transparent border border-white rounded-full size-2.5'></span>
          <span className='bg-transparent border border-white rounded-full size-2.5'></span>
        </span>
        <span>Before we start</span>
      </h2>
      <p className='opacity-90'>To work <span className='bg-green-500/20 px-[2px]'>MMM-OnSpotify</span> requires the following access to your account:</p>
      <Accordion
        type="single"
        collapsible
        className="w-full opacity-80 border border-border rounded-xl mt-4 mb-4"
        defaultValue="item-1"
      >
        <AccordionItem value="item-1">
          <AccordionTrigger className='px-4'>Display the current track</AccordionTrigger>
          <AccordionContent className="px-4 flex flex-col gap-4 text-balance">
            <p>
              Read your currently playing content and Spotify Connect devices information.
            </p>
            <p>
              <Badge variant="outline" className='border-green-500 text-green-500'>user-read-playback-state</Badge> <Badge variant="outline" className='border-green-500 text-green-500'>user-read-currently-playing</Badge>
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className='px-4'>Display cover art of albums/tracks when nothing is playing </AccordionTrigger>
          <AccordionContent className="px-4 flex flex-col gap-4 text-balance">
            <p>
              Read your top artists and content
            </p>
            <p>
              <Badge variant="outline" className='border-green-500 text-green-500'>user-top-read</Badge>
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger className='px-4'>Display your Spotify profile when nothing is playing</AccordionTrigger>
          <AccordionContent className="px-4 flex flex-col gap-4 text-balance">
            <p>
              Access your subscription details
            </p>
            <p>
              <Badge variant="outline" className='border-green-500 text-green-500'>user-read-private</Badge>
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Alert variant="default" className='mb-4'>
        <Stethoscope />
        <AlertTitle>There is no server, analytics or reporting in MMM-OnSpotify</AlertTitle>
        <AlertDescription>
          <ul className="list-inside list-disc text-sm">
            <li className='mt-1'>Everything <b>stays in your mirror</b>, the only third party service used is Spotify Connect.</li>
            <li className='mt-1.5'>You can find the <b>source code of this tool</b> in the module repo. This is a static page and only saves your tokens <b>inside your browser.</b></li>
            <li className='mt-1.5'>If you have multiple MM2 instances, its adviced to create different Spotify Apps or adjust polling rates.</li>
          </ul>
        </AlertDescription>
      </Alert>
      <Alert variant="destructive" className='mb-10'>
        <KeyRoundIcon />
        <AlertTitle>You cannot use MMM-NowPlayingOnSpotify credentials! <span className='opacity-60'>(or from other module)</span></AlertTitle>
        <AlertDescription>
          <p>The scopes included in NPOS are different from the requiered for MMM-OnSpotify to work. You can use your old Client ID/Secret to get a new token. </p>
        </AlertDescription>
      </Alert>

      <h2 className='leading-11 font-sans text-xl font-normal mb-1'>
        <span className='flex gap-1.5 items-center -mb-1'>
          <span className='bg-white border border-white rounded-full size-2.5'></span>
          <span className='bg-white border border-white rounded-full size-2.5'></span>
          <span className='bg-transparent border border-white rounded-full size-2.5'></span>
        </span>
        <span>Creating a Spotify App</span>
      </h2>
      <div className='opacity-90 p-3 px-4 border border-border rounded-xl mb-3 relative'>
        <div className='absolute -top-3 -right-3 bg-card border border-border rounded-full size-7 flex items-center justify-center'>
          <LayoutGrid className='size-4 text-green-500' />
        </div>
        <p className=''>First, we need to create a new Spotify App using the <a className='underline-offset-2 underline decoration-green-500' href='https://developer.spotify.com/dashboard/login'>Spotify Developer Portal</a>. After login in, click on the <span className='inline-block px-[4px] bg-violet-600/30 rounded-md'>Create app</span> button.</p>
        <p className='mt-2'>Next give it a name like "OnSpotify" or something that you can regonize, also write a small description. You can left the website blank.</p>
        <p className='mt-2'>Now add <span className='inline-block px-[4px] bg-yellow-600/30 rounded-md'>https://npos.fabriz.co/callback/</span> as the redirect URI (include the trailing <span className='inline-block px-[4px] bg-yellow-600/30 rounded-md'>/</span>), so Spotify knows to redirect you here with the credentials.</p>
        <p className='mt-2'>To finish the app creation, click on the <span className='inline-block px-[4px] bg-violet-600/30 rounded-md'>Web API</span> checkbox, then click the <span className='inline-block px-[4px] bg-violet-600/30 rounded-md'>Spotify ToS</span> checkbox to accept it and click on <span className='inline-block px-[4px] bg-violet-600/30 rounded-md'>Save</span>.</p>
      </div>
      <div className='opacity-90 p-3 px-4 border border-border rounded-xl mb-10 relative'>
        <div className='absolute -top-3 -right-3 bg-card border border-border rounded-full size-7 flex items-center justify-center'>
          <ShieldUser className='size-4 text-green-500' />
        </div>
        <p className=''>After successfully creating the app you’ll land on the app dashboard. click on the <span className='inline-block px-[4px] bg-violet-600/30 rounded-md'>User Management</span> tab.</p>
        <p className='mt-2'>There, enter the email associated to your Spotify Account, in the "Full Name" section you can put whatever name/abreviation that you want. Click on <span className='inline-block px-[4px] bg-violet-600/30 rounded-md'>Add user</span> to actually save your changes.</p>
        <p className='mt-2'>Once you added yourself as a user, go back to the <span className='inline-block px-[4px] bg-violet-600/30 rounded-md'>Basic Information</span> tab, there you can see your <span className='inline-block px-[4px] bg-yellow-600/30 rounded-md'>Client ID</span> and your <span className='inline-block px-[4px] bg-yellow-600/30 rounded-md'>Client Secret</span> (after clicking on “View client secret”). Check that the redirect URI is correct, then copy and paste both credentials in the card below.</p>
      </div>


      <h2 className='leading-11 font-sans text-xl font-normal mb-1' id='aut'>
        <span className='flex gap-1.5 items-center -mb-1'>
          <span className='bg-white border border-white rounded-full size-2.5'></span>
          <span className='bg-white border border-white rounded-full size-2.5'></span>
          <span className='bg-white border border-white rounded-full size-2.5'></span>
        </span>
        <span>Authorizing your app</span>
      </h2>
      <p className='opacity-90 mb-3'>
        Now that you have the credentials you can use the too to get your access token and refresh token.
      </p>
      <p className='opacity-90 mb-5'>
        If you want you can just use the configuration example in the repo and provide the tokens yourself, you can also see the source code of the tool in the repository <span className='inline-block px-[4px] bg-cyan-600/30 rounded-md'>/web</span> folder.
      </p>
      <Auth />
      <div className='relative'>
        <div id='ac1' className='absolute top-30'></div>
      </div>
      <p className='opacity-90 mb-3'>
        Now you can copy the generated tokens to your mirror <span className='inline-block px-[4px] bg-cyan-600/30 rounded-md'>config.js</span> file. Make sure to also add any style configuration that you want to use, you can find the full configuration options by clicking the documentation button. I recommend enabling <span className='inline-block px-[4px] bg-cyan-600/30 rounded-md'>Third party module theming</span> as it looks great!
      </p>
      <p className='opacity-90 mb-4'>
        After adding the configuration, restart your mirror and enjoy!
      </p>
      <Alert variant="destructive" className='mb-10'>
        <Trash2Icon />
        <AlertTitle>The tokens are stored in your browser</AlertTitle>
        <AlertDescription>
          <p>If you want, you can clean the data using the reset button on the tool after you entered any information.</p>
        </AlertDescription>
      </Alert>

    <div className='h-80'></div>
    </main>
  )
}


export default App
