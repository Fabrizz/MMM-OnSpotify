import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
import { BookIcon, Check, CloudDownload, Trash2Icon, UserLock, UserSearch, Verified } from "lucide-react"
import { useEffect, useState } from "react"
import { CopyButton } from "./copy"

function randomString16(l: number) {
  const array = new Uint8Array(l);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

let STATE_KEY: string = localStorage.getItem("STATE_KEY") || "";
if (STATE_KEY === "") {
  STATE_KEY = randomString16(16);
  localStorage.setItem("STATE_KEY", STATE_KEY);
  console.log("New state generated: ", STATE_KEY);
} else {
  STATE_KEY = localStorage.getItem("STATE_KEY") || "";
  console.log("Existing state found: ", STATE_KEY);
}

const AUTH_SCOPES = "user-read-playback-state user-read-currently-playing user-top-read user-read-private";
const AUTH_URL = new URL("https://accounts.spotify.com/authorize?");

const TOKEN_URL = new URL("https://accounts.spotify.com/api/token")
const REDIRECT_URI = "https://onsp.fabriz.co/"

const formSchema = z.object({
  cid: z.string("Client ID is requied.").min(10, {
    message: "Client ID should be longer.",
  }),
  secret: z.string("Client Secret is requied.").min(10, {
    message: "Client Secret should be longer.",
  }),
})

AUTH_URL.searchParams.set("response_type", "code");
AUTH_URL.searchParams.set("redirect_uri", REDIRECT_URI);
AUTH_URL.searchParams.set("scope", AUTH_SCOPES);
AUTH_URL.searchParams.set("show_dialog", "true");

const params = new URLSearchParams(window.location.search);
if (window.location.href.includes("code=") && window.location.href.includes("state=")) {
  const code = params.get("code");
  const state = params.get("state");

  if (state !== STATE_KEY) {
    console.error("State mismatch");
    alert("State mismatch, you can try again reseting this tool.");
  } else {
    localStorage.setItem("SPOTIFY_AUTH_CODE", code || "");
    console.log("New code: ", code);
    console.log("New state: ", state);

    const CID = localStorage.getItem("SPOTIFY_CLIENT_ID") || null;
    const SECRET = localStorage.getItem("SPOTIFY_CLIENT_SECRET") || null;

    if (code && CID && SECRET) {
      console.log("Exchanging code for token automatically...");
      exchangeCode(code, CID, SECRET);
    }
  }
} else if (window.location.href.includes("error=") && (params.get("state") === STATE_KEY)) {
  const error = params.get("error");
  console.error("Spotify Authorization Error: ", error);
  alert("Recieved an error from Spotify side, check your config:" + error);
}

async function exchangeCode(code: string, cid: string, secret: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + btoa(cid + ":" + secret),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI,
    }),
  })
  if (!res.ok) {
    console.error("Token exchange failed: ", res.statusText);
    alert("Token exchange failed: " + res.statusText);
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    window.location.reload();
    return;
  }
  const json = await res.json();
  console.log("Token response: ", json);

  if (json.access_token && json.refresh_token) {
    localStorage.setItem("SPOTIFY_ACCESS_TOKEN", json.access_token);
    localStorage.setItem("SPOTIFY_REFRESH_TOKEN", json.refresh_token);

    try {
      // try to get the user profile
      const profileRes = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          "Authorization": "Bearer " + json.access_token,
        },
      });
      if (!profileRes.ok) {
        console.error("Failed to fetch user profile: ", profileRes.statusText);
        return;
      }
      const profileJson = await profileRes.json();
      console.log("User profile: ", profileJson);

      localStorage.setItem("SPOTIFY_USER_ID", profileJson.id || "");
      localStorage.setItem("SPOTIFY_USER_NAME", profileJson.display_name || "");
      localStorage.setItem("SPOTIFY_USER_IMG", profileJson.images?.[0]?.url || "");
    } catch (error) {
      console.error("Error fetching user profile: ", error);
    }

    setTimeout(() => {
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      window.location.reload();
    }, 1100);
  }
}

function getCfg(cid: string, secret: string, access: string, refresh: string) {
  return `{
    /* Don't share your credentials! */
    module: "MMM-OnSpotify",
    position: "bottom_right", /* bottom_left, bottom_center */
    config: {
        clientID: "${cid}",
        clientSecret: "${secret}",
        accessToken: "${access}",
        refreshToken: "${refresh}",
        /* Add here other configuration options */
    }
}`;
}

export default function Auth() {  
  const dcid = localStorage.getItem("SPOTIFY_CLIENT_ID") || "";
  const dsecret = localStorage.getItem("SPOTIFY_CLIENT_SECRET") || "";
  const daccess = localStorage.getItem("SPOTIFY_ACCESS_TOKEN") || "";
  const drefresh = localStorage.getItem("SPOTIFY_REFRESH_TOKEN") || "";

  const duid = localStorage.getItem("SPOTIFY_USER_ID") || "";
  const duname = localStorage.getItem("SPOTIFY_USER_NAME") || "";
  const duimg = localStorage.getItem("SPOTIFY_USER_IMG") || "";

  console.log("Default credentials: ", [dcid, dsecret]);
  console.log("Existing tokens: ", [daccess, drefresh]);
  console.log("User info: ", [duid, duname, duimg]);

  const realTokens = (
    dcid !== "" &&
    dsecret !== "" &&
    daccess !== "" &&
    drefresh !== ""
  );

  useEffect(() => {
    if (realTokens) {
      const c = document.getElementById("ac1")
      
      if (c) c.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start"
      });
    }
  }, []);


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
    console.log("Saved new credentials: ", [values.cid, values.secret]);

    AUTH_URL.searchParams.set("client_id", values.cid);
    AUTH_URL.searchParams.set("client_secret", values.secret);
    AUTH_URL.searchParams.set("state", STATE_KEY);

    window.open(AUTH_URL, "_blank");
  }

  return (
    <div className="relative">
      {realTokens ? (
        <div className="relative mb-5">
          <div className='relative bg-card rounded-3xl p-2 border-dashed border-2 border-green-500/50'>
            {(duid !== "" && duname !== "") &&
              <div className="bg-background rounded-xl mb-2 flex flex-row gap-3 p-2 relative overflow-hidden">
                <img src={duimg} alt="" className="rounded-md size-30 absolute -top-5 -left-8 z-0 blur-[60px]" />
                <img src={duimg} alt="" className="rounded-md size-14 z-10 shadow-md" />
                <div className="flex flex-col justify-center gap-0">
                  <span className="font-bold text-lg flex items-center gap-1 -mb-1">
                    {duname}
                    <Verified className="size-3.5" />
                  </span>
                  <span className="opacity-60 text-sm">Id: {duid}</span>
                </div>
              </div>
            }
            <Card id="ssc" className='scroll-mt-20 rounded-xl relative overflow-hidden bg-background'>
              <span className='absolute -top-8 -left-8 w-28 h-16 bg-green-500 blur-3xl'></span>

              <CardHeader>
                <CardTitle>Successfully authorized your Spotify App</CardTitle>
                <CardDescription>You can now use the following configuration in your MagicMirror's config.js file:</CardDescription>
              </CardHeader>

              <CardContent className="mb-3">
                <div className="w-full relative">
                <pre className="px-3 py-3 bg-card/80 rounded-md overflow-x-scroll text-sm nice-scroll shadow-xl shadow-green-500/5">
                  <CopyButton value={getCfg(dcid, dsecret, daccess, drefresh)} className="absolute top-2 right-2 rounded-normal bg-white/10" />
                  {"{"}<br />
                  {"    "}<span className="text-emerald-600">/* Don't share your credentials! */</span><br />
                  {"    "}module: <span className="text-orange-400">"MMM-OnSpotify"</span>,<br />
                  {"    "}position: <span className="text-orange-400">"bottom_right"</span>, <span className="text-emerald-600">/* bottom_left, bottom_center */</span><br />
                  {"    "}config: {"{"}<br />
                  {"    "}{"    "}clientID: <span className="text-orange-400">"{dcid}"</span>,<br />
                  {"    "}{"    "}clientSecret: <span className="text-orange-400">"{dsecret}"</span>,<br />
                  {"    "}{"    "}accessToken: <span className="text-orange-400">"{daccess}"</span>,<br />
                  {"    "}{"    "}refreshToken: <span className="text-orange-400">"{drefresh}"</span>,<br />
                  {"    "}{"    "}<span className="text-emerald-600">/* Add here other configuration options */</span><br />
                  {"    "}{"}"}<br />
                  {"}"},
                  </pre>
                </div>
              </CardContent>
              <CardFooter className="flex-row gap-2 transition-all duration-300">
                <Button asChild variant={"outline"} size={"sm"}>
                  <a href="https://github.com/Fabrizz/MMM-OnSpotify?tab=readme-ov-file#module-configuration" className="">
                    <BookIcon className="inline size-4" />
                    <span>Documentation</span>
                  </a>
                </Button>
                <ResetDeleteButton>Reset & Delete all data</ResetDeleteButton>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
          <div className='relative'>
            <Card className='border border-border rounded-xl mb-4 relative overflow-hidden bg-transparent'>
              <span className='absolute -top-8 -left-8 w-28 h-16 bg-green-500 blur-3xl'></span>

              <CardHeader>
                <CardTitle>Get your Access Token</CardTitle>
                <CardDescription>Enter the Spotify App credentials to authorize it with your Spotify Account</CardDescription>
                { (dcid !== "" || dsecret !== "") &&
                  <CardAction className="mt-2">
                    <ResetDeleteButton></ResetDeleteButton>
                  </CardAction>
                }
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
                  <CardContent className="mb-6">
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='flex flex-col gap-1'>
                        <FormField
                          control={form.control}
                          name="cid"
                          defaultValue={dcid}
                          disabled={realTokens}
                          
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='gap-1'>
                                <UserSearch className='inline size-3.5' />
                                <span>Client ID</span>
                              </FormLabel>
                              <FormControl>
                                <Input placeholder='Your Client ID' autoComplete="off" {...field} />
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
                          disabled={realTokens}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='gap-1'>
                                <UserLock className='inline size-3.5' />
                                <span>Client Secret</span>
                              </FormLabel>
                              <FormControl>
                                <Input placeholder='Your Client Secret' autoComplete="off" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex-row gap-2 transition-all duration-300">
                    <Button type="submit" className="flex-1 transition-all duration-300" disabled={realTokens}>
                      {realTokens ? "Already authorized, see next step below!" : "Authorize with your Spotify account"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
            <div className='absolute z-10 -top-3 -right-3 bg-card border border-border rounded-full size-7 flex items-center justify-center'>
              <CloudDownload className='size-4 text-green-500' />
            </div>
          </div>
      )}
    </div>
  )
}

function resetData(r: boolean = false) {
  localStorage.removeItem("SPOTIFY_CLIENT_ID");
  localStorage.removeItem("SPOTIFY_CLIENT_SECRET");
  localStorage.removeItem("SPOTIFY_ACCESS_TOKEN");
  localStorage.removeItem("SPOTIFY_REFRESH_TOKEN");
  localStorage.removeItem("SPOTIFY_AUTH_CODE");
  localStorage.removeItem("STATE_KEY");
  localStorage.removeItem("SPOTIFY_USER_ID");
  localStorage.removeItem("SPOTIFY_USER_NAME");
  localStorage.removeItem("SPOTIFY_USER_IMG");
  localStorage.removeItem("SPOTIFY_TOKEN_DATE");

  if (r) {
    setTimeout(() => {
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      window.location.reload();
    }, 300);
  }
}

function ResetDeleteButton({ children }: {children?: React.ReactNode}) {
  const [reset, setReset] = useState(false)
  return (
  <Button
    variant="destructive"
    size={"sm"}
    className="flex-1"
    disabled={reset}
    onClick={() => { setReset(true); resetData();}}
  >
      {reset ? <Check className="inline size-4" /> : <Trash2Icon className="inline size-4" />}
      {children}
  </Button>
  )
}