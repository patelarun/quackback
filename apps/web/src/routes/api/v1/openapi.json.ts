import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v1/openapi/json')({
  server: {
    handlers: {
      /**
       * GET /api/v1/openapi/json
       * Returns the OpenAPI 3.1 specification for this instance's API.
       *
       * Teammate-only. The spec carries no customer data, but it is a complete
       * map of 57 endpoints, and this install is a private support portal
       * rather than a developer platform — nobody outside the team has a use
       * for it, and an attacker holding a leaked key does.
       */
      GET: async () => {
        // Gated on api_key.manage, not merely "signed in": a portal user is a
        // principal too (role 'user'), so a bare requireAuth would still hand
        // the endpoint map to every customer with an account. The permission
        // that can mint a key is exactly the audience that can act on the
        // reference.
        const { requireAuth } = await import('@/lib/server/functions/auth-helpers')
        const { PERMISSIONS } = await import('@/lib/shared/permissions')
        try {
          await requireAuth({ permission: PERMISSIONS.API_KEY_MANAGE })
        } catch {
          return Response.json({ error: 'Access denied' }, { status: 403 })
        }

        const { generateOpenAPISpec } = await import('@/lib/server/domains/api/openapi')

        // Import all schema registrations
        await import('@/lib/server/domains/api/schemas')

        const spec = generateOpenAPISpec()

        return Response.json(spec, {
          headers: {
            'Content-Type': 'application/json',
            // Authenticated now, so no shared cache may hold it.
            'Cache-Control': 'private, no-store',
            Vary: 'Host, Cookie',
          },
        })
      },
    },
  },
})
