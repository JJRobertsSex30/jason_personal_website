# 🌍 IP Geolocation Service Setup Guide
*Configuring ipgeolocation.io for Enhanced Analytics*

**Service:** ipgeolocation.io  
**Free Tier:** 30,000 requests/month  
**Setup Time:** 5 minutes  

---

## 🚀 **Quick Setup**

### **Step 1: Get API Key**
1. Visit [ipgeolocation.io](https://ipgeolocation.io/)
2. Click **"Sign Up"** (free account)
3. Verify your email address
4. Go to **Dashboard** → **API Keys**
5. Copy your **API Key**

### **Step 2: Add to Environment**
1. Open `.env.local` in your project root
2. Add the API key:
```bash
IPGEOLOCATION_API_KEY=your_api_key_here
```

### **Step 3: Verify Setup**
1. Restart your development server
2. Visit your homepage
3. Check browser console for geolocation logs
4. Should see: `[abTester] Geolocation data retrieved: { country: "US", region: "California", city: "San Francisco" }`

---

## 📊 **What Data Is Collected**

### **Geographic Information**
- **Country Code:** `US`, `CA`, `GB`, etc.
- **Region/State:** `California`, `Ontario`, `England`
- **City:** `San Francisco`, `Toronto`, `London`

### **Privacy & Compliance**
- ✅ **GDPR Compliant:** No personal data collected
- ✅ **IP Not Stored:** Only geographic region data saved
- ✅ **User Anonymous:** No tracking of individual users
- ✅ **Cached Results:** Minimizes external API calls

---

## ⚙️ **Technical Details**

### **API Usage**
- **Free Tier:** 30,000 requests/month
- **Cache Duration:** 24 hours per IP
- **Fallback:** Graceful degradation if API unavailable
- **Performance:** Non-blocking, parallel with other tracking

### **Files Modified**
- `src/lib/geoLocationService.ts` - Core geolocation logic
- `src/pages/api/geolocation.ts` - Server-side API endpoint
- `src/lib/abTester.ts` - Impression tracking with geolocation
- `.env.local` - API key configuration

### **Error Handling**
- **API Unavailable:** Continues with `null` geographic values
- **Rate Limits:** Cached results prevent repeated calls
- **Invalid IPs:** Private/local IPs skip geolocation
- **Network Errors:** Non-blocking, logs warnings only

---

## 📈 **Benefits**

### **Enhanced Analytics**
- **Geographic Segmentation:** Performance by region
- **Content Localization:** Targeted content by location
- **Marketing Attribution:** Campaign effectiveness by geography
- **User Experience:** Location-aware personalization

### **Business Intelligence**
- **Market Analysis:** Top performing regions
- **Expansion Planning:** Identify growth opportunities
- **Compliance:** Regional privacy law adherence
- **Fraud Detection:** Unusual geographic patterns

---

## 🔧 **Troubleshooting**

### **Common Issues**

**No geolocation data in console:**
- Check `.env.local` has correct API key
- Verify API key is valid on ipgeolocation.io dashboard
- Restart development server after adding key

**"API key not configured" warning:**
- Ensure `.env.local` file exists in project root
- Check spelling: `IPGEOLOCATION_API_KEY` (exact match)
- No spaces around the equals sign in env file

**Geographic fields still `null` in database:**
- Check browser network tab for `/api/geolocation` requests
- Verify API endpoint returns successful response
- Check server logs for geolocation service errors

**Rate limit exceeded:**
- Free tier: 30,000 requests/month
- Caching should prevent most repeated calls
- Consider upgrading plan if needed: $15/month for 150k requests

### **Testing Commands**

**Test API key:**
```bash
curl "https://api.ipgeolocation.io/ipgeo?apiKey=YOUR_API_KEY&ip=8.8.8.8"
```

**Test local endpoint:**
```bash
curl http://localhost:4321/api/geolocation
```

**Check environment variables:**
```bash
# In project directory
cat .env.local | grep IPGEOLOCATION
```

---

## 📋 **API Key Security**

### **Best Practices**
- ✅ **Environment Variables:** Never commit API keys to git
- ✅ **Server-Side Only:** API calls made from server, not client
- ✅ **Rate Limiting:** Built-in caching prevents abuse
- ✅ **Domain Restrictions:** Configure in ipgeolocation.io dashboard

### **Production Deployment**
- Add `IPGEOLOCATION_API_KEY` to production environment variables
- Verify API key has sufficient request quota
- Monitor usage in ipgeolocation.io dashboard
- Set up alerts for approaching rate limits

---

## 📖 **Additional Resources**

- **ipgeolocation.io Documentation:** https://ipgeolocation.io/documentation.html
- **API Reference:** https://ipgeolocation.io/documentation/ip-geolocation-api.html
- **Pricing Plans:** https://ipgeolocation.io/pricing.html
- **Support:** support@ipgeolocation.io

---

*With this setup, your analytics now capture rich geographic data while maintaining user privacy and system performance!* 