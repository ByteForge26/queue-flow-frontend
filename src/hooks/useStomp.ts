// =====================================================================
// FILE: useStomp.ts
// =====================================================================
import { useEffect, useRef } from "react";
// @stomp/stompjs – yahi library WebSocket + STOMP protocol handle karti hai.
// Client: STOMP connection ka main object.
// IMessage: server se aane wale message ka TypeScript type (body, headers, etc.)
import { Client, type IMessage } from "@stomp/stompjs";
// SockJS – ek fallback library hai. Agar browser native WebSocket support nahi
// karta, to SockJS automatically HTTP long-polling jaise alternatives use karta
// hai. Isliye seedha new WebSocket() ke bajaye new SockJS() use kiya gaya hai.
import SockJS from "sockjs-client";

// Config file se backend ka WebSocket URL import karte hain. Ye URL
// environment variable (VITE_API_URL) ke hisaab se set hota hai – local dev ya
// production server ke liye alag ho sakta hai.
// WS_URL: backend ka WebSocket endpoint URL hai, e.g. "https://queueflow-backend.onrender.com/ws" ya local dev mein "/ws".
// production mein "<backend-url>/ws" (jab frontend aur backend alag domains pe ho) ya local dev mein "/ws" (same origin) use hota hai.
// dekh config.ts file for details.
import { WS_URL } from "../lib/config";

/**
 * Ek STOMP topic ko subscribe karta hai aur har message pe callback chalata hai.
 * Backend in-memory broker `/topic/...` pe publish karta hai.
 */
// =====================================================================
// useStomp – MAIN CUSTOM HOOK
//
// PURPOSE: Ye hook do kaam karta hai:
//   1. WebSocket connection banata hai server ke saath (via SockJS + STOMP)
//   2. Diye gaye `topic` ko subscribe karta hai – jab bhi server message
//      bhejta hai, `onMessage` callback ko call karta hai parsed data ke saath.
//
// PARAMETERS:
//   topic     (string)   – STOMP topic jise subscribe karna hai,
//                           e.g. "/topic/queue/abc123"
//   onMessage (function) – callback jo har incoming message pe call hoga.
//                           Argument: parsed JSON object (ya raw string agar
//                           JSON parse fail ho jaye)
//
// RETURNS: kuch nahi (void) – side-effect hook hai, state ya value return
//          nahi karta. Effect cleanup mein connection automatically band hota
//          hai jab component unmount ho.
// =====================================================================
export function useStomp(topic: string, onMessage: (body: any) => void): void {

    // useRef se hum `onMessage` callback ka ek "box" banate hain.
    // cbRef.current hamesha latest callback function ko point karta hai.
    // Ye isliye zaroori hai kyunki useEffect ke andar purana (stale) closure
    // capture ho sakta hai – agar directly `onMessage` use karte to har render
    // pe effect re-run hota. Ref ke through latest function milta hai bina
    // effect dobara chalaye.
    const cbRef: React.MutableRefObject<(body: any) => void> = useRef(onMessage);

    // Har render pe cbRef.current ko latest `onMessage` se update karo.
    // Isse guarantee milti hai ki jab bhi server message aaye, us waqt ka
    // sabse fresh callback call ho – chahe parent component ne callback change
    // kiya ho ya nahi.
    cbRef.current = onMessage;

    // useEffect: ye block tab run hota hai jab component mount ho YA jab
    // `topic` prop change ho. Topic change hone pe purana connection band
    // hota hai aur naye topic ke liye naya connection banta hai.
    useEffect((): (() => void) => {

        // Naya STOMP Client object banao. Isme configuration options pass ki hain:
        const client = new Client({

            // webSocketFactory: SockJS factory function. STOMP library jab
            // connection kholna chahti hai to ye function call karti hai.
            // "/ws" – backend ka WebSocket endpoint URL (relative path, same origin).
            webSocketFactory: (): WebSocket => new SockJS(WS_URL) as unknown as WebSocket,

            // reconnectDelay: agar connection toot jaye (network issue, server
            // restart) to 3000ms (3 seconds) baad automatic reconnect try karega.
            // Ye feature production apps mein bahut important hai – user ko
            // manually refresh nahi karna padega.
            reconnectDelay: 3000,

            // onConnect: ye callback tab chalti hai jab STOMP handshake successfully
            // complete ho jaye (connection ready ho). Sirf tab subscribe karna safe
            // hai, isliye subscription yahan hai – bahar nahi.
            onConnect: (): void => {

                // Ab connected hain, isliye `topic` pe subscribe karo.
                // `client.subscribe(topic, callback)` – server jab bhi is topic pe
                // message publish karega, ye callback call hogi.
                client.subscribe(topic, (msg: IMessage): void => {
                    try {
                        // msg.body ek raw string hota hai. JSON.parse se use JavaScript
                        // object mein convert karo taaki component easily use kar sake.
                        cbRef.current(JSON.parse(msg.body));
                    } catch {
                        // Agar JSON parse fail ho (e.g. server ne plain text bheja), to
                        // raw string hi pass kar do – crash mat karo.
                        cbRef.current(msg.body);
                    }
                });
            },
        });

        // client.activate() – actually connection shuru karo. Ye line ke bina
        // Client sirf configured hoga, connected nahi. Activate ke baad SockJS
        // connection open hoti hai aur STOMP handshake hota hai.
        client.activate();

        // CLEANUP FUNCTION: React useEffect se ye function tab call hota hai jab:
        //   a) Component unmount ho (page se hata diya jaye), ya
        //   b) `topic` dependency change ho (naya topic subscribe karna ho)
        // void keyword isliye lagaya hai kyunki deactivate() ek Promise return
        // karta hai – hum us promise ka result nahi chahiye, isliye void se
        // explicitly ignore karte hain (TypeScript warning avoid hoti hai).
        return (): void => {
            void client.deactivate();
        };

        // Dependency array: [topic] – sirf jab `topic` string change ho tab hi
        // effect dobara run ho. `onMessage` yahan nahi hai kyunki hum cbRef trick
        // use kar rahe hain – isse unnecessary reconnects avoid hote hain.
    }, [topic]);
}