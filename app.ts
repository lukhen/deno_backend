import {serve, Handler} from "https://deno.land/std@0.142.0/http/server.ts";
import {getUserHandler, getUserDb, findClientsHandler, Customer} from "./functions.ts"
import * as TE from "https://deno.land/x/fp_ts@v2.11.4/TaskEither.ts"
import * as T from "https://deno.land/x/fp_ts@v2.11.4/Task.ts"
import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import * as A from "https://deno.land/x/fp_ts@v2.11.4/Array.ts"

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

const connect: (client: Client) => TE.TaskEither<string, Client> = 
    client => pipe(
	TE.tryCatch(
	    () => client.connect(),
	    reason => reason as string),
	TE.map(
	    () => client
	)

    )    
    
const queryArray: (sql: string) => (client: Client) => TE.TaskEither<string, Array<Array<unknown>>> = 
    sql => client => {
	return pipe(
	    client,
	    client => TE.tryCatch(
		() => client.queryArray(sql),
		reason => reason as string
	    ),
	    TE.map(x => x.rows),
	)
    }


const findClients: (name: string) => TE.TaskEither<string, Customer[]> =
    name => pipe(
		  new Client({
	      user: "pguser",
	      database: "pgdb",
	      hostname: "postgresdb",
	      password: "pgpass",
	      port: 5432
	  }),
	    connect,
	    TE.chain(queryArray(`select "Nazwisko" as name, "Adres" as address, "Telefon" as phone, "Email" as email from "Klienci" where UPPER("Nazwisko") like UPPER(\'%${name}%\');`)),
	TE.map(A.map(x => ({name: `${x[0]}`, phone: `${x[2]}`, email: `${x[3]}`, address: `${x[1]}`})))
    )

const clientHandler = findClientsHandler(findClients)

serve(teToPromise(clientHandler))






