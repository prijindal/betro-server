FROM buildpack-deps:bullseye-scm

WORKDIR /app

COPY dist/ ./

CMD [ "/app/dist/linux-x64/server" ]