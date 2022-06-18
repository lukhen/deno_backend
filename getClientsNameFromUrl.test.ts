import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
import * as O from "https://deno.land/x/fp_ts@v2.11.4/Option.ts"
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import * as A from "https://deno.land/x/fp_ts@v2.11.4/Array.ts"

/**
If url pathname matches '/clients/client_name' produce O.some(client_name).
Otherwise produce O.none
*/
export const getClientsNameFromUrl: (url: string) => O.Option<string> =
    urlString => pipe(
	O.tryCatch(() => new URL(urlString)),
	O.map(url => url.pathname),
	O.map(pathname => pathname.match("^/clients/.*$")),
	O.chain(matches => O.fromNullable(matches)),
	O.map(matches => matches[0]),
	O.map(pathname => pathname.split("/")),
	O.chain(A.last)
    )



Deno.test("empty url string", () => {
    assertEquals(getClientsNameFromUrl(""), O.none)
})
Deno.test("unempty url string, invalid url", () => {
    assertEquals(getClientsNameFromUrl("some string, but not url"), O.none)
})
Deno.test("valid url, wrong pathname", () => {
    assertEquals(getClientsNameFromUrl("http://valid.url/wrong/pathname"), O.none)
})

Deno.test("valid url, good pathname", () => {
    assertEquals(getClientsNameFromUrl("http://valid.url/clients/clientname"), O.some("clientname"))
})
