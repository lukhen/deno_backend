import {serve, Handler} from "https://deno.land/std@0.142.0/http/server.ts";
import {getUserHandler, getUserDb} from "./functions.ts"
import * as TE from "https://deno.land/x/fp_ts@v2.11.4/TaskEither.ts"
import * as T from "https://deno.land/x/fp_ts@v2.11.4/Task.ts"
import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
type HandlerTE = (request: Request) => TE.TaskEither<string, Response>


/**
Change HandlerTE to Handler
*/
const teToPromise: (handlerTE: HandlerTE) => Handler =
    handlerTE => request => pipe(
	request,
	handlerTE,
	TE.matchE<string, Response, Response>(
	    e => T.of(new Response(e)),
	    T.of
	)
    )()

const db = {
    superman: {name: "Clark Kent"},
    batman: {name: "Bruce Wayne"},
    spiderman: {name: "Peter Parker"},
    ironman: {name: "Tony Stark"},
    hulk: {name: "Bruce Banner"},
}

const getUser = getUserDb(db)

const handler = getUserHandler(getUser)

serve(teToPromise(handler))






