export default defineAppConfig({
  theme: {
    primaryColor: '#ababab'
  },
  plans: [
    {
      id: 'free',
      name: 'Free',
      providers: 1,
      price: 0,
      productId: null,
    },
    {
      id: 'pro_monthly',
      name: 'Pro - Monthly',
      providers: 10,
      price: 10,
      productId: '79f0c0ef-3d56-4645-943c-b9bf3c0937f3',
    },
    {
      id: 'pro_yearly',
      name: 'Pro - Yearly',
      providers: 10,
      price: 100,
      productId: 'ed456ff0-293c-4bf5-8583-7831a4b3ed8a',
    }
  ]
})
