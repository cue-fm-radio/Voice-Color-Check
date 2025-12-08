import { v4 as uuidv4 } from 'uuid';

export interface Env {
    BUCKET: R2Bucket;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        try {
            const formData = await request.formData();
            const image = formData.get("image") as File;

            if (!image) {
                return new Response("No image provided", { status: 400 });
            }

            const filename = `${crypto.randomUUID()}.png`;

            // Upload to R2
            await env.BUCKET.put(filename, image, {
                httpMetadata: {
                    contentType: "image/png",
                },
            });

            // Construct Public URL
            // You need to enable "R2.dev subdomain" in your R2 bucket settings and paste the URL here.
            // It usually looks like: https://pub-xxxxxxxxxxxxxxxx.r2.dev
            const R2_DEV_URL = "https://pub-3eac0df6bfdf43f4b4dc8268bd515932.r2.dev";
            const publicUrl = `${R2_DEV_URL}/${filename}`;

            return new Response(JSON.stringify({ url: publicUrl }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });

        } catch (error) {
            console.error(error);
            return new Response("Internal Server Error", { status: 500 });
        }
    },
};
