import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CloudDownload, UserLock, UserSearch } from "lucide-react"

function randomString16(l: number) {
  const array = new Uint8Array(l);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

let STATE_KEY: string = localStorage.getItem("STATE_KEY") || "";
if (STATE_KEY === "") {
  STATE_KEY = randomString16(16);
  localStorage.setItem("STATE_KEY", STATE_KEY);
} else {
  STATE_KEY = localStorage.getItem("STATE_KEY") || "";
}

const AUTH_SCOPES = "user-read-playback-state user-read-currently-playing user-top-read user-read-private";
const AUTH_URL = new URL("https://accounts.spotify.com/authorize?");

const formSchema = z.object({
  cid: z.string("Client ID is requied.").min(10, {
    message: "Client ID should be longer.",
  }),
  secret: z.string("Client Secret is requied.").min(10, {
    message: "Client Secret should be longer.",
  }),
})

AUTH_URL.searchParams.set("response_type", "code");
AUTH_URL.searchParams.set("redirect_uri", "https://onsp.fabriz.co/callback");
AUTH_URL.searchParams.set("scope", AUTH_SCOPES);
AUTH_URL.searchParams.set("show_dialog", "true");


export default function Auth() {
  const dcid = localStorage.getItem("SPOTIFY_CLIENT_ID") || "";
  const dsecret = localStorage.getItem("SPOTIFY_CLIENT_SECRET") || "";
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cid: dcid,
      secret: dsecret,
    },
  })
  function onSubmit(values: z.infer<typeof formSchema>) {
    localStorage.setItem("SPOTIFY_CLIENT_ID", values.cid);
    localStorage.setItem("SPOTIFY_CLIENT_SECRET", values.secret);

    AUTH_URL.searchParams.set("client_id", values.cid);
    AUTH_URL.searchParams.set("client_secret", values.secret);
    AUTH_URL.searchParams.set("state", STATE_KEY);

    window.open(AUTH_URL, "_blank");
  }

  return (
    <div className='relative'>
      <Card className='border border-border rounded-xl mb-10 relative overflow-hidden bg-transparent'>
        <span className='absolute -top-8 -left-8 w-28 h-16 bg-green-500 blur-3xl'></span>

        <CardHeader>
          <CardTitle>Get your Access Token</CardTitle>
          <CardDescription>Enter the Spotify App credentials to authorize it with your Spotify Account</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="mb-6">
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='flex flex-col gap-1'>
                  <FormField
                    control={form.control}
                    name="cid"
                    defaultValue={dcid}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='gap-1'>
                          <UserSearch className='inline size-3.5' />
                          <span>Client ID</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder='Your Client ID' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <FormField
                    control={form.control}
                    name="secret"
                    defaultValue={dsecret}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='gap-1'>
                          <UserLock className='inline size-3.5' />
                          <span>Client Secret</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder='Your Client Secret' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full">
                Authorize with your Spotify account
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      <div className='absolute z-10 -top-3 -right-3 bg-card border border-border rounded-full size-7 flex items-center justify-center'>
        <CloudDownload className='size-4 text-green-500' />
      </div>
    </div>
  )
}