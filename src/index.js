export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Dynamic Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Submit Order (Public API)
    if (url.pathname === '/api/public/order' && request.method === 'POST') {
      try {
        const body = await request.json();
        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

        await env.DB.prepare(
          `INSERT INTO orders (id, tenant_id, landing_page_id, customer_name, customer_phone, customer_address, product_name, quantity, unit_price, delivery_charge, total_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          orderId,
          body.tenant_id,
          body.landing_page_id || 'lp-001',
          body.name,
          body.phone,
          body.address,
          body.product_name,
          body.quantity || 1,
          body.unit_price,
          body.delivery_charge || 0,
          body.total_amount
        ).run();

        return new Response(JSON.stringify({ success: true, message: 'Order created successfully', orderId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 2. Fetch Client Isolated Orders
    if (url.pathname === '/api/client/orders' && request.method === 'GET') {
      const tenantId = request.headers.get('X-Tenant-ID');
      if (!tenantId) {
        return new Response(JSON.stringify({ error: 'Tenant ID required' }), { status: 400, headers: corsHeaders });
      }

      const { results } = await env.DB.prepare(`SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC`).bind(tenantId).all();
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Admin: Fetch All Orders Across Tenants
    if (url.pathname === '/api/admin/orders' && request.method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ message: "Funders Backend Engine Active" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};
