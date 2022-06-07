import {serve} from "https://deno.land/std@0.142.0/http/server.ts";
import { assert, assertEquals, fail } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import * as TE from "https://deno.land/x/fp_ts@v2.11.4/TaskEither.ts"
import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
import * as T from "https://deno.land/x/fp_ts@v2.11.4/Task.ts"

//const server = Deno.listen({ port: 8080 })

interface User {
    name: string
}

const user: User = {
    name: "lukh"
}

const handler: (req: Request) => TE.TaskEither<string, Response> =
    req => {
	return TE.right(new Response(JSON.stringify(user)))
    }
Deno.test("handler can handle an arbitrary request", async () => {
    const req = new Request("https://example.com", {method: "GET"})
    
    const test  = await pipe(
	req,
	handler,
	TE.chain(r => TE.tryCatch(
	    () => r.json(),
	    reason => `${reason}`
	)),
	TE.matchE<string, User, () => void>(
	    e => T.of(() => {fail(e)}),
	    o => T.of(() => {assertEquals(o, user)})
	))()
    
    test()
})

