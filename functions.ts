import * as TE from "https://deno.land/x/fp_ts@v2.11.4/TaskEither.ts"
import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
import * as O from "https://deno.land/x/fp_ts@v2.11.4/Option.ts"
import * as A from "https://deno.land/x/fp_ts@v2.11.4/Array.ts"
import {getClientsNameFromUrl} from "./getClientsNameFromUrl.test.ts"

export interface User {
    name: string
}

export interface Customer {
    name: string,
    address: string,
    email: string,
    phone: string
}

/**
* Produce (asynchrounously) a Response from a Request.
* If everything went ok produces right(Response).
* In case of failure produces left(string) where string is an error message.
* Thanks to TaskEither the promise never fails.
*
 @example
* const req = new Request("https://example.com/users/user1", {method: "GET"})    
* const getUser = getUserDb({user1: {name: "user1"}})
* const user = await pipe(
*		getUserHandler(getUser)(req),
*		TE.chain(r => TE.tryCatch(
*		    () => r.json() as Promise<User>,
*		    reason => `${reason}`
*		)),
* )()
* const userNameOrErrorMsg = E.isRight(user) ? user.right.name : user.left
* assertEquals(userNameOrErrorMsg, "user1")
* 
*/
export const getUserHandler: (getUser: (name: string) => TE.TaskEither<string, User>) => (req: Request) => TE.TaskEither<string, Response> =
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

type getUserDbFT = (db: Record<string, User>) => (name: string) => TE.TaskEither<string, User>
/**
Asynchronously fetch user from database.
* @example
* const user = await getUserDb({user0: {name: "user0"}
*                               user1: {name: "user1"},
*                               user2: {name: "user2"}}
* 			    )("user1")()
* assertEquals(user, E.right({name: "user1"}))
*
*/
export const getUserDb: getUserDbFT =
    db => name => {	
	return db[name] ? TE.right(db[name]) : TE.left("no such user")
    }


/**
 If url pathname matches '/users/user_name' produce O.some(user_name).
 Otherwise produce O.none

 @example
* assertEquals(getUserNameFromUrl("http://valid.url/wrong/pathname"), O.none)
* assertEquals(getUserNameFromUrl("http://valid.url/users/username"), O.some("username"))
*/
export const getUserNameFromUrl : (urlString: string) => O.Option<string> =
    urlString => pipe(
	O.tryCatch(() => new URL(urlString)),
	O.map(url => url.pathname),
	O.map(pathname => pathname.match("^/users/.*$")),
	O.chain(matches => O.fromNullable(matches)),
	O.map(matches => matches[0]),
	O.map(pathname => pathname.split("/")),
	O.chain(A.last)
    )



/**
!!!
*/
export const findClientsHandler: (findClients: (name: string) => TE.TaskEither<string, Customer[]>) => (request: Request) => TE.TaskEither<string, Response> =
    findClients => request => pipe(
	getClientsNameFromUrl(request.url),
	O.map(findClients),
	O.match(
	    () => TE.left("no client's name in url"),
	    TE.map(x => new Response(JSON.stringify(x)))
	)
    )
