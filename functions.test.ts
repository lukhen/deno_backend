import { assertEquals, fail } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {getUserDb, getUserHandler, getUserNameFromUrl, User} from "./functions.ts"
import * as E from "https://deno.land/x/fp_ts@v2.11.4/Either.ts"
import * as TE from "https://deno.land/x/fp_ts@v2.11.4/TaskEither.ts"
import * as TC4 from "https://raw.githubusercontent.com/lukhen/denoutils/main/taskcoproduct4.ts"
import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
import * as T from "https://deno.land/x/fp_ts@v2.11.4/Task.ts"
import * as O from "https://deno.land/x/fp_ts@v2.11.4/Option.ts"

const LUKH: User = {
    name: "lukh"
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
    const user = await getUserDb({lukh: LUKH,
				  user1: {name: "user1"},
				  user2: {name: "user2"}}
				)("user1")()
    assertEquals(user, E.right({name: "user1"}))
})

Deno.test("multiple items, user not found", async () => {
    const user = await getUserDb({lukh: LUKH, user1: {name: "user1"}, user2: {name: "user2"}})("user3")()
    assertEquals(user, E.left("no such user"))
})


Deno.test("getUserHandler, user1 exists", async () => {
    const req = new Request("https://example.com/users/user1", {method: "GET"})    
    const getUser = getUserDb({user1: {name: "user1"}})
    const test = await pipe(
	TC4.fromPairOfSums(
	    pipe(
		getUserHandler(getUser)(req),
		TE.chain(r => TE.tryCatch(
		    () => r.json() as Promise<User>,
		    reason => `${reason}`
		)),
	    ),
	    getUser("user1")
	),
	TC4.fold(
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

Deno.test("getUserHandler, user2 exists", async () => {
    const req = new Request("https://example.com/users/user2", {method: "GET"})    
    const getUser = getUserDb({user2: {name: "some name of user2"}})
    const test = await pipe(
	TC4.fromPairOfSums(
	    pipe(
		getUserHandler(getUser)(req),
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
	TC4.fold(
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

Deno.test("getUserHandler, user2 doesn't exist", async () => {
    const req = new Request("https://example.com/users/user2", {method: "GET"})    
    const getUser = getUserDb({user1: {name: "user1_name"}})
    const test = await pipe(
	TC4.fromPairOfSums(
	    pipe(
		getUserHandler(getUser)(req),
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
	TC4.fold(
	    ([e1, e2]) => T.of(() => {
		assertEquals(e1, e2)
	    }),
	    ([e, _]) => T.of(() => {fail(`${e} 1`)}),
	    ([_, e]) => T.of(() => {fail(`${e} 2`)}),
	    ([resp_user, fetched_user]) => T.of(() => {
		fail(`${resp_user}, ${fetched_user}`)
	    })
	    
	)
    )() as () => void
    
    test()

})



Deno.test("empty url string", () => {
    assertEquals(getUserNameFromUrl(""), O.none)
})
Deno.test("unempty url string, invalid url", () => {
    assertEquals(getUserNameFromUrl("some string, but not url"), O.none)
})
Deno.test("valid url, wrong pathname", () => {
    assertEquals(getUserNameFromUrl("http://valid.url/wrong/pathname"), O.none)
})

Deno.test("valid url, good pathname", () => {
    assertEquals(getUserNameFromUrl("http://valid.url/users/username"), O.some("username"))
})
