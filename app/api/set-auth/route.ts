import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Create an HTML page that sets localStorage and redirects
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authenticating...</title>
      </head>
      <body>
        <script>
          localStorage.setItem('lastfm_username', '${username}');
          window.location.href = '/dashboard';
        </script>
        <p>Redirecting to dashboard...</p>
      </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  })
}
