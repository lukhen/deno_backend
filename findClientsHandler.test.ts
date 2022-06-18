import * as TE from "https://deno.land/x/fp_ts@v2.11.4/TaskEither.ts"
import * as TC4 from "./taskcoproduct4.ts"
import {pipe} from "https://deno.land/x/fp_ts@v2.11.4/function.ts"
import * as O from "https://deno.land/x/fp_ts@v2.11.4/Option.ts"
import { assertEquals, fail } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import * as T from "https://deno.land/x/fp_ts@v2.11.4/Task.ts"
import {getClientsNameFromUrl} from "./getClientsNameFromUrl.test.ts"

interface Client {
    name: string,
    address: string,
    email: string,
    phone: string
}

type findClientsFT = (name: string) => TE.TaskEither<string, Client[]>

type findClientsHandlerFT = (findClients: findClientsFT) => (request: Request) => TE.TaskEither<string, Response>
/**
!!!
*/
const findClientsHandler: findClientsHandlerFT =
    findClients => request => pipe(
	getClientsNameFromUrl(request.url),
	O.map(findClients),
	O.match(
	    () => TE.left("no client's name in url"),
	    TE.map(x => new Response(JSON.stringify(x)))
	)
    )



Deno.test("empty", async () => {
    const url = "https://example.com/clients/client1"
    const req = new Request(url, {method: "GET"})
    const findClientsEmpty: findClientsFT =
	name => TE.right([])

    const x = await pipe(
	TC4.fromPairOfSums(
	    pipe(
		findClientsHandler(findClientsEmpty)(req),
		TE.chain(r => TE.tryCatch(
		    () => r.json() as Promise<Client[]>,
		    reason => `${reason}`
		))
	    ),
	    pipe(
		getClientsNameFromUrl(url),
		O.map(findClientsEmpty),
		O.match(
		    () => TE.left("no client's name in url"),
		    x => x
		)
	    )
	),
	TC4.fold(
	    ([e1, e2]) => T.of(() => {fail(`${e1}, ${e2}`)}),
	    ([e, clients]) => T.of(() => {fail("2")}),
	    ([clients, e]) => T.of(() => {fail(`${clients}, ${e}`)}),
	    ([clients1, clients2]) => T.of (() => {assertEquals(clients1, clients2)})
	)
    )() as () => void
    x()
})


Deno.test("one", async () => {
    const url = "https://example.com/clients/smith"
    const req = new Request(url, {method: "GET"})
    const findOneClient: findClientsFT =
	name => TE.right([{name: "John Smith", address: "Polna 1", email: "john@smith.js", phone: "112233"}])

    const x = await pipe(
	TC4.fromPairOfSums(
	    pipe(
		findClientsHandler(findOneClient)(req),
		TE.chain(r => TE.tryCatch(
		    () => r.json() as Promise<Client[]>,
		    reason => `${reason}`
		))
	    ),
	    pipe(
		getClientsNameFromUrl(url),
		O.map(findOneClient),
		O.match(
		    () => TE.left("no client's name in url"),
		    x => x
		)
	    )
	),
	TC4.fold(
	    ([e1, e2]) => T.of(() => {fail(`${e1}, ${e2}`)}),
	    ([e, clients]) => T.of(() => {fail(`${e}, ${clients}`)}),
	    ([clients, e]) => T.of(() => {fail(`${clients}, ${e}`)}),
	    ([clients1, clients2]) => T.of (() => {assertEquals(clients1, clients2)})
	)
    )() as () => void
    x()
})


