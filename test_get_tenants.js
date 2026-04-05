const { getTenants } = require('./src/lib/actions/tenants');

// We need to simulate server actions without next.js context
// Which is hard because it uses cookies().
