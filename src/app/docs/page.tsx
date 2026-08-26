"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

/**
 * Web API reference for the Hermes BFF (`/api/hermes/*`), rendered from the
 * OpenAPI document served at `/api/hermes/openapi`. Dark-themed to sit with the
 * console. This is the interactive "swagger" surface — browse endpoints, see
 * schemas, and send requests against the live BFF.
 */
export default function DocsPage() {
  return (
    <div className="min-h-dvh">
      <ApiReferenceReact
        configuration={{
          url: "/api/hermes/openapi",
          darkMode: true,
          hideDarkModeToggle: true,
          metaData: { title: "Hermes BFF API" },
        }}
      />
    </div>
  );
}
