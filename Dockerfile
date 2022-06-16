FROM denoland/deno:1.22.1

WORKDIR /usr/app

COPY ./ /usr/app

CMD ["deno", "run", "--allow-net", "app.ts"]