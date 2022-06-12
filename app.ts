import {serve} from "https://deno.land/std@0.142.0/http/server.ts";
import { assert, assertEquals, fail } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import * as TE from "https://deno.land/x/fp_ts@v2.11.4/TaskEither.ts"
import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
import * as T from "https://deno.land/x/fp_ts@v2.11.4/Task.ts"
import * as E from "https://deno.land/x/fp_ts@v2.11.4/Either.ts"
import * as O from "https://deno.land/x/fp_ts@v2.11.4/Option.ts"
import * as R from "https://deno.land/x/fp_ts@v2.11.4/Record.ts"
import * as A from "https://deno.land/x/fp_ts@v2.11.4/Array.ts"

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
    


type getUserDbFT = (db: Record<string, User>) => (name: string) => TE.TaskEither<string, User>
/**
!!!
*/
const getUserDb: getUserDbFT =
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

Deno.test("multiple items, user found", async () => {
    const user = await getUserDb({lukh: LUKH, user1: {name: "user1"}, user2: {name: "user2"}})("user1")()
    assertEquals(user, E.right({name: "user1"}))
})

Deno.test("multiple items, user not found", async () => {
    const user = await getUserDb({lukh: LUKH, user1: {name: "user1"}, user2: {name: "user2"}})("user3")()
    assertEquals(user, E.left("no such user"))
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

const getUserHandler2: (getUser: (name: string) => TE.TaskEither<string, User>) => (req: Request) => TE.TaskEither<string, Response> =
    getUser => request => {
	return pipe(
	    getUserNameFromUrl(request.url),
	    O.map(getUser),
	    O.match(
		    () => TE.left("no user in url"),
		    u => TE.map(
			u => new Response(JSON.stringify(u)))(u)
	    )
	)
    }

Deno.test("getUserHandler2, user1 exists", async () => {
    const req = new Request("https://example.com/users/user1", {method: "GET"})    
    const getUser = getUserDb({user1: {name: "user1"}})
    const test = await pipe(
	TC.fromPairOfSums(
	    pipe(
		getUserHandler2(getUser)(req),
		TE.chain(r => TE.tryCatch(
		    () => r.json() as Promise<User>,
		    reason => `${reason}`
		)),
	    ),
	    getUser("user1")
	),
	TC.fold(
	    ([e1, e2]) => T.of(() => {fail("this should not be reached 1")}),
	    (_) => T.of(() => {fail("this should not be reached 2")}),
	    (_) => T.of(() => {fail("this should not be reached 3")}),
	    ([resp_user, fetched_user]) => T.of(() => {
		assertEquals(resp_user, fetched_user)
	    })
	    
	)
    )() as () => void
    
    test()

})
/**
!!!
*/
const getUserNameFromUrl : (url: string) => O.Option<string> =
    url => A.last(new URL(url).pathname.split("/"))
    
Deno.test("getUserHandler2, user2 exists", async () => {
    const req = new Request("https://example.com/users/user2", {method: "GET"})    
    const getUser = getUserDb({user2: {name: "some name of user2"}})
    const test = await pipe(
	TC.fromPairOfSums(
	    pipe(
		getUserHandler2(getUser)(req),
		TE.chain(r => TE.tryCatch(
		    () => r.json() as Promise<User>,
		    reason => `${reason}`
		)),
	    ),
	    pipe(
		getUserNameFromUrl(req.url),
		O.map(getUser),
		O.match(
		    () => TE.left("no user in url"),
		    x => x
		)
	    )
	),
	TC.fold(
	    ([e1, e2]) => T.of(() => {fail(`${e1}, ${e2}`)}),
	    ([e, _]) => T.of(() => {fail(`${e} 1`)}),
	    ([_, e]) => T.of(() => {fail(`${e} 2`)}),
	    ([resp_user, fetched_user]) => T.of(() => {
		assertEquals(resp_user, fetched_user)
	    })
	    
	)
    )() as () => void
    
    test()

})

