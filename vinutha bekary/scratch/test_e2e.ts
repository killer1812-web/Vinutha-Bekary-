// Automated end-to-end integration test for Vinutha Bakery backend and domain models
async function runTests() {
  const baseUrl = 'http://localhost:5000/api';
  console.log('🧪 Starting Vinutha Bakery End-to-End Integration Tests...\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, msg: string) {
    totalCount++;
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      process.exitCode = 1;
    }
  }

  // 1. Single Shop Settings
  console.log('--- TEST SUITE 1: Single Shop Settings & Profile ---');
  const shopRes = await fetch(`${baseUrl}/shop`);
  assert(shopRes.ok, 'GET /api/shop returns 200 OK');
  const shopData: any = await shopRes.json();
  assert(shopData.name.includes('Vinutha Bakery'), `Active shop name is "${shopData.name}"`);
  assert(Boolean(shopData.upiId), `Active shop has configured UPI ID: ${shopData.upiId}`);
  assert(Boolean(shopData.advancePercentage), `Active shop has advance percentage: ${shopData.advancePercentage}%`);

  // 2. Cakes List & Eggless Classification
  console.log('\n--- TEST SUITE 2: Cake Catalog & Eggless Classification ---');
  const cakesRes = await fetch(`${baseUrl}/cakes`);
  assert(cakesRes.ok, 'GET /api/cakes returns 200 OK');
  const cakesData: any = await cakesRes.json();
  assert(Array.isArray(cakesData) && cakesData.length > 0, `Loaded ${cakesData.length} cake products`);
  const egglessCount = cakesData.filter((c: any) => c.eggOrEggless === 'eggless').length;
  const withEggCount = cakesData.filter((c: any) => c.eggOrEggless === 'contains_egg').length;
  assert(egglessCount > 0, `Found ${egglessCount} "100% Eggless" cakes`);
  assert(withEggCount > 0, `Found ${withEggCount} "Contains Egg" cakes`);

  // 3. Customer Authentication (Name + 10-digit mobile, no OTP)
  console.log('\n--- TEST SUITE 3: Customer Login & Session Isolation ---');
  const authRes = await fetch(`${baseUrl}/customer/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ramesh Kumar', phone: '9845099881' }),
  });
  assert(authRes.ok, 'POST /api/customer/auth returns 200 OK');
  const authData: any = await authRes.json();
  assert(Boolean(authData.customer && authData.token), 'Customer auth generated low-assurance session token');
  const custToken = authData.token;
  const custPhone = authData.customer.phone;

  // 4. Create Normal Order with Multi-Item & Birthday Details
  console.log('\n--- TEST SUITE 4: Cake Ordering with Occasion & Cart ---');
  const orderRes = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop-1',
      customerName: 'Ramesh Kumar',
      customerPhone: custPhone,
      cakeName: 'Belgian Dark Truffle Cake',
      categorySlug: 'normal-cakes',
      size: '1.5 kg',
      flavour: 'Belgian Dark Chocolate',
      eggOrEggless: 'eggless',
      occasion: 'Birthday',
      birthdayPersonName: 'Aarav',
      nameOnCake: 'Happy 5th Birthday Aarav',
      messageOnCake: 'Grow with stars and smile always!',
      quantity: 1,
      unitPrice: 950,
      totalAmount: 950,
      advancePaid: 475,
      balanceAmount: 475,
      requiredDate: '2026-10-15',
      requiredTime: '5:30 PM',
      fulfillmentType: 'pickup',
      upiTransactionRef: 'UPI-REF-987654321012',
    }),
  });
  assert(orderRes.ok, 'POST /api/orders returns 200 OK');
  const orderData: any = await orderRes.json();
  assert(Boolean(orderData.id && orderData.orderNumber), `Order created with number: ${orderData.orderNumber}`);
  assert(orderData.paymentStatus === 'advance_pending_verification', 'Order status set to advance_pending_verification until staff confirmation');
  assert(orderData.isPaymentVerified === false, 'Payment verified is initially false');

  // 5. Customer Order Isolation Check
  console.log('\n--- TEST SUITE 5: Customer Order Privacy & Isolation ---');
  const custOrdersRes = await fetch(`${baseUrl}/customer/orders`, {
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  assert(custOrdersRes.ok, 'GET /api/customer/orders returns 200 OK');
  const custOrders: any = await custOrdersRes.json();
  assert(custOrders.some((o: any) => o.id === orderData.id), 'Customer can see their own order');
  assert(custOrders.every((o: any) => o.customerPhone === custPhone), 'All returned customer orders strictly belong to this phone number');

  // Unauthenticated lookup masking check
  const publicOrderRes = await fetch(`${baseUrl}/orders/${orderData.orderNumber}`);
  assert(publicOrderRes.ok, 'GET /api/orders/:identifier returns 200 OK');
  const publicOrder: any = await publicOrderRes.json();
  assert(publicOrder.customerPhone.includes('***'), `Public lookup masks phone: ${publicOrder.customerPhone}`);

  // 6. Custom Design Request & Quotation Lifecycle
  console.log('\n--- TEST SUITE 6: Custom Bespoke Cake & Quotation Lifecycle ---');
  const customOrderRes = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'shop-1',
      customerName: 'Ramesh Kumar',
      customerPhone: custPhone,
      cakeName: 'Custom Bespoke Designer Cake',
      categorySlug: 'custom',
      size: '3.0 kg',
      flavour: 'Red Velvet Cream Cheese',
      eggOrEggless: 'eggless',
      occasion: 'Anniversary',
      nameOnCake: 'Happy 25th Silver Jubilee Mom & Dad',
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      advancePaid: 0,
      balanceAmount: 0,
      requiredDate: '2026-10-20',
      requiredTime: '7:00 PM',
      fulfillmentType: 'pickup',
      specialInstructions: '2-tier floral structure with edible silver pearl accents',
      isCustomDesign: true,
    }),
  });
  assert(customOrderRes.ok, 'POST /api/orders (Custom) returns 200 OK');
  const customOrder: any = await customOrderRes.json();
  assert(customOrder.status === 'under_review', 'Custom order status initialized to under_review');

  // Staff submits quotation
  const quoteRes = await fetch(`${baseUrl}/orders/${customOrder.id}/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer demo-token-owner',
    },
    body: JSON.stringify({
      quotedPrice: 3200,
      advanceRequired: 1600,
      notes: 'Price includes 2-tier internal support and bespoke edible flowers',
    }),
  });
  assert(quoteRes.ok, 'POST /api/orders/:id/quote returns 200 OK');

  // Customer checks notifications
  const notifRes = await fetch(`${baseUrl}/customer/notifications`, {
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  assert(notifRes.ok, 'GET /api/customer/notifications returns 200 OK');
  const notifs: any = await notifRes.json();
  const quoteNotif = notifs.find((n: any) => n.orderId === customOrder.id);
  assert(Boolean(quoteNotif), 'Customer received in-app notification for quote');
  assert(quoteNotif.quotedPrice === 3200, `Quote notification indicates ₹${quoteNotif.quotedPrice}`);

  // Customer accepts quotation
  const acceptRes = await fetch(`${baseUrl}/customer/quotes/${customOrder.id}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${custToken}`,
    },
    body: JSON.stringify({ accept: true }),
  });
  assert(acceptRes.ok, 'POST /api/customer/quotes/:id/respond (accept) returns 200 OK');

  // 7. Staff UPI Payment Verification
  console.log('\n--- TEST SUITE 7: Staff UPI Bank Verification ---');
  const verifyRes = await fetch(`${baseUrl}/orders/${orderData.id}/verify-payment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer demo-token-owner',
    },
    body: JSON.stringify({ isVerified: true, verifiedBy: 'Owner / Senior Baker' }),
  });
  assert(verifyRes.ok, 'PUT /api/orders/:id/verify-payment returns 200 OK');
  const verifyData: any = await verifyRes.json();
  assert(verifyData.isPaymentVerified === true, 'Order payment is successfully marked verified');
  assert(verifyData.paymentStatus === 'advance_paid', 'Order paymentStatus updated to advance_paid');

  console.log(`\n======================================================`);
  console.log(`🎉 TEST SUMMARY: ${passedCount}/${totalCount} assertions passed cleanly!`);
  console.log(`======================================================\n`);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
