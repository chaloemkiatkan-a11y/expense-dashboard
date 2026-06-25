async function handleMembers(request, env) {
  const url = new URL(request.url);
  
  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare("SELECT * FROM members").all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }
  
  if (request.method === "POST") {
    try {
      const { name } = await request.json();
      if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }
      await env.DB.prepare("INSERT INTO members (name) VALUES (?)")
        .bind(name)
        .run();
      return new Response(JSON.stringify({ success: true }), { 
        status: 201, 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }
  
  if (request.method === "DELETE") {
    try {
      const name = url.searchParams.get("name");
      if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }
      
      // Update tasks to prevent orphan tasks
      await env.DB.prepare("UPDATE tasks SET assignee = 'ไม่มีผู้รับผิดชอบ' WHERE assignee = ?")
        .bind(name)
        .run();
        
      // Delete member
      await env.DB.prepare("DELETE FROM members WHERE name = ?")
        .bind(name)
        .run();
        
      return new Response(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }
  
  return new Response("Method not allowed", { status: 405 });
}

async function handleTasks(request, env) {
  const url = new URL(request.url);
  
  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare("SELECT * FROM tasks").all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }
  
  if (request.method === "POST") {
    try {
      const task = await request.json();
      if (!task.id || !task.title || !task.deadline || !task.assignee) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }
      await env.DB.prepare(
        "INSERT INTO tasks (id, title, description, deadline, assignee, status, priority) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(task.id, task.title, task.description || "", task.deadline, task.assignee, task.status || "todo", task.priority || "medium")
        .run();
      return new Response(JSON.stringify({ success: true }), { 
        status: 201, 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }
  
  if (request.method === "PUT") {
    try {
      const task = await request.json();
      if (!task.id) {
        return new Response(JSON.stringify({ error: "Task ID is required" }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }
      await env.DB.prepare(
        "UPDATE tasks SET title = ?, description = ?, deadline = ?, assignee = ?, status = ?, priority = ? WHERE id = ?"
      )
        .bind(task.title, task.description || "", task.deadline, task.assignee, task.status, task.priority, task.id)
        .run();
      return new Response(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }
  
  if (request.method === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Task ID is required" }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }
      await env.DB.prepare("DELETE FROM tasks WHERE id = ?")
        .bind(id)
        .run();
      return new Response(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }
  
  return new Response("Method not allowed", { status: 405 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route for Members API
    if (url.pathname.startsWith("/api/members")) {
      return handleMembers(request, env);
    }
    
    // Route for Tasks API
    if (url.pathname.startsWith("/api/tasks")) {
      return handleTasks(request, env);
    }
    
    // Serve static asset from Pages
    return env.ASSETS.fetch(request);
  }
};
