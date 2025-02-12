const headers = {  
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept"
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if(request.method === "OPTIONS") {
            return new Response(null, { headers })
        } else if (url.pathname === "/ai") {
            return await handleAIRequest(request, env);
        } else if (url.pathname === "/reset") {
            return await resetConversation(request, env)
        } else if (url.pathname === "/get-history") {
            return await getHistory(request, env)
        } else {
            return new Response("Not found", { status: 404 });
        }
    }
};

async function handleAIRequest(request, env) {
    const { prompt } = await request.json();
    if (!prompt) {
        return new Response("Missing prompt", { status: 400 });
    }

    let history = []
    try{
        const raw = await env.KV.get("history")
        const parsed = JSON.parse(raw)
        history = parsed || []
    } catch(err) {}

    try {
        const messages = [
            { 
                role: "system", 
                content: `Language: es-ES
                    Eres un amigable asistente conversacional en castellano que tiene que guiar a una persona para que encuentre un regalo, pero de forma indirecta y sin dar indicaciones exactas.
                    - El usuario que te habla se llama Eva y es hoy su cumpleaños número 35, felicítala y dile que tienes un regalo para ella.
                    - Tus respuestas no han de ser demasiado largas
                    - El usuario puede hacer deducciones incorrectas y le tienes que corregir si se desvía del resultado
                    - Insinua que sabes algo sobre un regalo que va a recibir
                    - No des pistas si el usuario no las pide
                    - El regalo es una cena en un restaurante caro, pero eso nunca lo digas de forma explícita, solo puedes hacer alguna referencia o juego de palabras relacionado, es la sorpresa que tiene que encontrar el usuario.
                    - Como pistas se podría utilizar las siguientes (aunque si se te ocurre algo más lo puedes usar):
                        - Que está dentro del edificio en el que está pero fuera del piso (está en el cuarto de las bicicletas, esto no lo digas directamente).
                        - Que está en un medio de transporte (porque la bicicleta es un medio de transporte, si el usuario dice que si es en el coche dile que casi pero que es otro medio de transporte)
                        - Que está en un objeto redondo y oscuro (un neumático de bicicleta, esto no lo digas directamente). Puedes hacer alguna referencia escatológica a que algo redondo y oscuro parece la definición de un ano, le hará gracia.
                    - El regalo está EN la bicicleta pero no es una bicicleta (no lo tienes que decir)
                    - El usuario te hará preguntas y tú tienes que acabar por guiarle para que vaya al cuarto de las bicicletas y mire en una rueda.
                `
            },
            {
                role: "user",
                content: "Hola, soy Eva y cumplo 35 años hoy. Es mi cumpleaños! Háblame de tú y en español"
            },
            ...history,
            {
                role: "user",
                content: prompt
            }
        ]

        const aiRes = await env.AI.run(env.AI_MODEL, { messages });

        await env.KV.put("history", JSON.stringify([
            ...messages.slice(2),
            {
                role: "assistant",
                content: aiRes?.response
            }
        ]))

        return new Response(JSON.stringify(aiRes.response), { headers });

    } catch (error) {
        return new Response(`AI error: ${error.message}`, { status: 500 });
    }
}

async function getHistory(request, env) {
    try{
        const history = await env.KV.get("history")
        return new Response(JSON.stringify(history), { headers })
    } catch(err) {
        console.log(87, err)
        return new Response("Loading chat history failed", { status: 500 })
    }
}

async function resetConversation(request, env) {
    try{
        await env.KV.put("history", "[]")
        return new Response("Conversation resetted successfully", { status: 200 })
    } catch(err) {
        console.log(err)
        return new Response("Reset failed", { status: 500 })
    }
}
