module.exports = {
  nobstacle: {
    output: {
      mode: "tags-split",
      target: "src/lib/nobstacle-api-client/react-query/client.ts",
      schemas: "src/lib/nobstacle-api-client/react-query/types",
      client: "react-query",
      mock: true,
      override: {
        mutator: {
          path: "src/lib/nobstacle-api-client/custom-instance.ts",
          name: "customInstance"
        }
      }
    },
    input: {
      target: "./openapi-bundled.json"
    }
    // hooks: {
    //   afterAllFilesWrite: ["yarn format"]
    // }
  }
}
