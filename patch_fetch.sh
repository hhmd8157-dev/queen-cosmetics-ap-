#!/bin/bash
sed -i 's/const data = await res.json();/if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();/g' src/components/AdminDashboardModal.tsx
sed -i 's/const data = await res.json();/if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();/g' src/components/LiveOrderTrackerModal.tsx
