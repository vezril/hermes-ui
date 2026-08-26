/**
 * OpenAPI 3.0 description of Hermes's Backend-for-Frontend (`/api/hermes/*`) —
 * the same-origin API this app serves. The browser and any external client
 * (Insomnia, curl) talk to these routes; the BFF proxies HermesMQ's `/v1` REST
 * admin API server-side and injects the `HERMES_TOKEN` bearer, so callers of the
 * BFF need no token. Served as JSON at `GET /api/hermes/openapi` and rendered at
 * `/docs`. This object is the single source of truth for the docs page and the
 * Insomnia collection — keep it in sync when routes change.
 */
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Hermes BFF API",
    version: "0.1.7",
    description:
      "The Backend-for-Frontend for the Hermes operator console. These same-origin " +
      "`/api/hermes/*` routes proxy HermesMQ's REST admin API and inject the server-side " +
      "bearer token, so clients of the BFF authenticate to *the console's host*, not to " +
      "HermesMQ directly. Topic and subscription listings come from HermesMQ's " +
      "eventually-consistent stats projection.",
  },
  servers: [
    { url: "/api/hermes", description: "Same-origin BFF (relative to the console host)" },
  ],
  tags: [
    { name: "Topics", description: "Create, inspect, label, and delete topics." },
    { name: "Subscriptions", description: "Create, list, and delete subscriptions." },
    { name: "Messaging", description: "Publish messages and tap a topic's live traffic." },
    { name: "Observability", description: "Health and Prometheus metrics." },
  ],
  paths: {
    "/topics": {
      get: {
        tags: ["Topics"],
        summary: "List topics",
        description: "Every non-deleted topic with its published-message count.",
        responses: {
          "200": {
            description: "Topic listing.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/TopicSummary" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Topics"],
        summary: "Create a topic",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["topicId"],
                properties: {
                  topicId: { type: "string", example: "orders.events" },
                  labels: { $ref: "#/components/schemas/Labels" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created." },
          "400": {
            description: "Invalid topic id.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "409": {
            description: "A topic with that id already exists (or the id is reserved).",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/topics/{id}": {
      parameters: [{ $ref: "#/components/parameters/TopicId" }],
      get: {
        tags: ["Topics"],
        summary: "Get a topic",
        description: "A topic's label map.",
        responses: {
          "200": {
            description: "Topic detail.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Topic" } } },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Topics"],
        summary: "Replace a topic's labels",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["labels"],
                properties: { labels: { $ref: "#/components/schemas/Labels" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Labels replaced." },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Topics"],
        summary: "Delete a topic",
        responses: {
          "200": { description: "Deleted." },
          "204": { description: "Deleted." },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/subscriptions": {
      get: {
        tags: ["Subscriptions"],
        summary: "List subscriptions",
        description: "Every subscription with its queue-health stats.",
        responses: {
          "200": {
            description: "Subscription listing.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Subscription" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Subscriptions"],
        summary: "Create a subscription",
        description: "Binds a subscription id to a topic.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["subscriptionId", "topicId"],
                properties: {
                  subscriptionId: { type: "string", example: "orders.fulfillment" },
                  topicId: { type: "string", example: "orders.events" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created." },
          "400": {
            description: "Missing or invalid ids.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "409": {
            description: "Subscription id already exists or is reserved (deleted ids stay reserved).",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/subscriptions/{id}": {
      parameters: [{ $ref: "#/components/parameters/SubscriptionId" }],
      delete: {
        tags: ["Subscriptions"],
        summary: "Delete a subscription",
        description:
          "Deletes the subscription and drops its backlog. The id stays **reserved** " +
          "afterwards — HermesMQ's journal keeps its events, so it cannot be recreated with " +
          "the same name.",
        responses: {
          "204": { description: "Deleted." },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/publish": {
      post: {
        tags: ["Messaging"],
        summary: "Publish a message",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublishInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Publish result.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/PublishResult" } },
            },
          },
        },
      },
    },
    "/tap": {
      get: {
        tags: ["Messaging"],
        summary: "Tap a topic's live traffic (SSE)",
        description:
          "Opens a Server-Sent Events stream of messages arriving on the topic, via a " +
          "Hermes-managed non-destructive inspector subscription. Each `message` event's " +
          "`data` is a JSON `TapMessage`. Consume with an EventSource, not a plain fetch.",
        parameters: [
          {
            name: "topic",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "orders.events",
          },
        ],
        responses: {
          "200": {
            description: "An event stream.",
            content: {
              "text/event-stream": {
                schema: { $ref: "#/components/schemas/TapMessage" },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Observability"],
        summary: "HermesMQ health",
        description: "SERVING when the broker is reachable and up; NOT_SERVING otherwise.",
        responses: {
          "200": {
            description: "Health status.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthStatus" } },
            },
          },
        },
      },
    },
    "/metrics": {
      get: {
        tags: ["Observability"],
        summary: "Prometheus metrics",
        description:
          "HermesMQ's Prometheus text exposition, forwarded verbatim. The sole source of the " +
          "per-topic active-producer count (`hermesmq_topic_producers`).",
        responses: {
          "200": {
            description: "Prometheus text exposition.",
            content: { "text/plain": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/openapi": {
      get: {
        tags: ["Observability"],
        summary: "This OpenAPI document",
        responses: {
          "200": {
            description: "The OpenAPI 3.0 spec for this API.",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      TopicId: {
        name: "id",
        in: "path",
        required: true,
        description: "Topic id.",
        schema: { type: "string" },
        example: "orders.events",
      },
      SubscriptionId: {
        name: "id",
        in: "path",
        required: true,
        description: "Subscription id.",
        schema: { type: "string" },
        example: "orders.fulfillment",
      },
    },
    responses: {
      NotFound: {
        description: "Not found.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
    schemas: {
      Labels: {
        type: "object",
        description: "Arbitrary string key/value metadata.",
        additionalProperties: { type: "string" },
        example: { team: "commerce", tier: "gold" },
      },
      TopicSummary: {
        type: "object",
        required: ["topicId", "publishedTotal"],
        properties: {
          topicId: { type: "string" },
          publishedTotal: { type: "integer", description: "Messages published to this topic." },
        },
      },
      Topic: {
        type: "object",
        required: ["topicId", "labels"],
        properties: {
          topicId: { type: "string" },
          labels: { $ref: "#/components/schemas/Labels" },
        },
      },
      Subscription: {
        type: "object",
        required: [
          "subscriptionId",
          "topicId",
          "backlog",
          "oldestUnackedAgeSeconds",
          "redeliveredTotal",
          "deadLetteredTotal",
        ],
        properties: {
          subscriptionId: { type: "string" },
          topicId: { type: "string" },
          backlog: { type: "integer", description: "Queue depth (unacked messages)." },
          oldestUnackedAgeSeconds: { type: "integer" },
          redeliveredTotal: { type: "integer" },
          deadLetteredTotal: { type: "integer", description: "Dead-letter count (no browse/replay)." },
        },
      },
      PublishInput: {
        type: "object",
        required: ["topicId", "payload"],
        properties: {
          topicId: { type: "string", example: "orders.events" },
          payload: { type: "string", example: '{"hello":"world"}' },
          attributes: { $ref: "#/components/schemas/Labels" },
          ttlSeconds: { type: "integer", nullable: true },
          idempotencyKey: { type: "string", nullable: true },
        },
      },
      PublishResult: {
        type: "object",
        required: ["messageId", "deduplicated"],
        properties: {
          messageId: { type: "string" },
          deduplicated: {
            type: "boolean",
            description: "True when an idempotency key matched a prior publish.",
          },
        },
      },
      TapMessage: {
        type: "object",
        required: ["id", "payload", "isText", "attributes", "publishTime"],
        properties: {
          id: { type: "string", description: "Per-observation id (for React keys)." },
          payload: { type: "string" },
          isText: { type: "boolean", description: "False when the payload is not valid UTF-8." },
          attributes: { $ref: "#/components/schemas/Labels" },
          publishTime: { type: "string", format: "date-time" },
        },
      },
      HealthStatus: {
        type: "string",
        enum: ["SERVING", "NOT_SERVING", "UNKNOWN"],
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          hermesStatus: {
            type: "integer",
            description: "The upstream HermesMQ status, when the error originated there.",
          },
        },
      },
    },
  },
} as const;
