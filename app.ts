import {serve} from "https://deno.land/std@0.142.0/http/server.ts";
import { assert, assertEquals, fail } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import * as TE from "https://deno.land/x/fp_ts@v2.11.4/TaskEither.ts"
import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
import * as T from "https://deno.land/x/fp_ts@v2.11.4/Task.ts"
import * as E from "https://deno.land/x/fp_ts@v2.11.4/Either.ts"
import * as O from "https://deno.land/x/fp_ts@v2.11.4/Option.ts"
import * as R from "https://deno.land/x/fp_ts@v2.11.4/Record.ts"
import * as TC from "./taskcoproduct4.ts"

//const server = Deno.listen({ port: 8080 })

interface User {
    name: string
}

const LUKH: User = {
    name: "lukh"
}

/**
!!!
*/
const getUser: (name: string) => TE.TaskEither<string, User> =
    name => TE.right(LUKH)
    

/**
!!!
*/
const getUserDb: (db: Record<string, User>) => (name: string) => TE.TaskEither<string, User> =
    db => name => {
	
	return db[name] ? TE.right(db[name]) : TE.left("no such user")
    }


Deno.test("empty", async () => {
    const user = await getUserDb({})("lukh")()
    assertEquals(user, E.left("no such user"))
})

Deno.test("single item, user not found", async () => {
    const user = await getUserDb({user1: {name: "user1"}})("lukh")()
    assertEquals(user, E.left("no such user"))
})

Deno.test("single item, user found", async () => {
    const user = await getUserDb({lukh: LUKH})("lukh")()
    assertEquals(user, E.right(LUKH))
})

/**
 Produce (asynchrounously) a Response from a Request.
 If everything went ok produces right(Response).
 In case of failure produces left(string) where string is an error message.
 Thanks to TaskEither the promise never fails.

 @example
 const req = new Request("https://example.com/users/lukh", {method: "GET"})    
 const test  = await pipe(
	req,
	getUserHandler,
	TE.chain(r => TE.tryCatch(
	    () => r.json(),
	    reason => `${reason}`
	)),
	TE.matchE<string, User, () => void>(
	    e => T.of(() => {fail(e)}),
	    o => T.of(() => {assertEquals(o, LUKH)})
	))()
 @example
 const x = 100

*/
const getUserHandler: (req: Request) => TE.TaskEither<string, Response> =
    req => {
	return pipe(
	    getUser("lukh"),
	    TE.map(
		u => new Response(JSON.stringify(u))
	    )
	)
    }

Deno.test("request to fetch the user named lukh", async () => {
    const req = new Request("https://example.com/users/lukh", {method: "GET"})    
    const test = await pipe(
	TC.fromPairOfSums(
	    pipe(
		getUserHandler(req),
		TE.chain(r => TE.tryCatch(
		    () => r.json() as Promise<User>,
		    reason => `${reason}`
		)),
	    ),
	    getUser("lukh")
	),
	TC.fold(
	    (_) => T.of(() => {fail("this should not be reached")}),
	    (_) => T.of(() => {fail("this should not be reached")}),
	    (_) => T.of(() => {fail("this should not be reached")}),
	    ([resp_user, fetched_user]) => T.of(() => {
		assertEquals(resp_user, fetched_user)
	    })
	    
	)
    )() as () => void
    
    test()
})

