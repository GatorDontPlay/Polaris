# 🔍 **PDR Status Debug Guide**

## **🚨 Current Issue:**
PDR at `http://localhost:3000/pdr/demo-pdr-1755225394194/review` shows status "Submitted" instead of expected status.

## **📊 Status Flow Explanation:**

### **Expected PDR Status Progression:**
1. **`'Created'`** → Initial status when PDR is first created
2. **`'SUBMITTED'`** → When employee clicks "Submit PDR for Review" 
3. **`'UNDER_REVIEW'`** → When CEO starts reviewing
4. **`'COMPLETED'`** → When PDR process is finished

### **Status Display Mapping:**
```typescript
'Created' → Badge: "Draft"
'SUBMITTED' → Badge: "Submitted" 
'UNDER_REVIEW' → Badge: "Under Review"
'COMPLETED' → Badge: "Completed"
```

## **🔧 Debug Steps:**

### **Step 1: Check Console Logs**
1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Navigate to**: `http://localhost:3000/pdr/demo-pdr-1755225394194/review`
4. **Look for**: "Review page debug:" log entry
5. **Check values**:
   ```javascript
   {
     pdrId: "demo-pdr-1755225394194",
     pdr: { id: "...", status: "???", ... },
     pdrStatus: "???",  // This tells us the actual status
     submittedAt: "???" // If this exists, PDR was submitted
   }
   ```

### **Step 2: Check localStorage**
1. **Open Browser DevTools** (F12)
2. **Go to Application tab** → **Storage** → **Local Storage**
3. **Look for keys**:
   - `demo_current_pdr` → Main PDR data
   - `demo_pdr_demo-pdr-1755225394194` → Specific PDR data
4. **Check status field** in the JSON data

### **Step 3: Determine Root Cause**
Based on the status found:

#### **If status is `'Created'`:**
- ✅ **Correct**: Should show "Draft" badge
- ❌ **Bug**: If showing "Submitted", there's a display issue

#### **If status is `'SUBMITTED'`:**
- ✅ **Correct**: Should show "Submitted" badge  
- ℹ️ **Explanation**: Someone clicked "Submit PDR for Review"

## **🔄 How to Reset PDR Status:**

### **Option 1: Reset via Browser Console**
```javascript
// Get current PDR
const currentPDR = JSON.parse(localStorage.getItem('demo_current_pdr'));
console.log('Current PDR:', currentPDR);

// Reset status to 'Created'
currentPDR.status = 'Created';
delete currentPDR.submittedAt; // Remove submission timestamp
currentPDR.updatedAt = new Date().toISOString();

// Save back to localStorage
localStorage.setItem('demo_current_pdr', JSON.stringify(currentPDR));
localStorage.setItem(`demo_pdr_${currentPDR.id}`, JSON.stringify(currentPDR));

// Refresh page to see changes
window.location.reload();
```

### **Option 2: Create Fresh PDR**
1. **Go to**: `http://localhost:3000/`
2. **Select**: "Employee" role
3. **Dashboard**: Click "Create New PDR" 
4. **New PDR**: Will have status `'Created'` and show "Draft"

## **🎯 Expected vs Actual:**

### **For New PDR (Never Submitted):**
- **Status**: `'Created'`
- **Badge**: "Draft" 
- **Buttons**: "Submit PDR for Review" visible
- **submittedAt**: `undefined` or `null`

### **For Submitted PDR:**
- **Status**: `'SUBMITTED'`  
- **Badge**: "Submitted"
- **Buttons**: Submit button hidden (already submitted)
- **submittedAt**: Date when submitted

## **🚀 Test Scenarios:**

### **Scenario A: First Time Creation**
1. Create new PDR → Status should be `'Created'` → Badge "Draft"
2. Add goals → Status remains `'Created'` → Badge "Draft"  
3. Review page → Status `'Created'` → Badge "Draft" → Submit button visible

### **Scenario B: After Submission**
1. Click "Submit PDR for Review" → Status changes to `'SUBMITTED'`
2. Review page → Status `'SUBMITTED'` → Badge "Submitted" → Submit button hidden
3. CEO dashboard → Should show PDR in pending reviews

## **💡 Quick Fix Commands:**

### **Check Current Status:**
```javascript
console.log('PDR Status:', JSON.parse(localStorage.getItem('demo_current_pdr'))?.status);
```

### **Reset to Draft:**
```javascript
const pdr = JSON.parse(localStorage.getItem('demo_current_pdr'));
pdr.status = 'Created';
delete pdr.submittedAt;
localStorage.setItem('demo_current_pdr', JSON.stringify(pdr));
localStorage.setItem(`demo_pdr_${pdr.id}`, JSON.stringify(pdr));
```

### **Submit PDR:**
```javascript
const pdr = JSON.parse(localStorage.getItem('demo_current_pdr'));
pdr.status = 'SUBMITTED';
pdr.submittedAt = new Date().toISOString();
localStorage.setItem('demo_current_pdr', JSON.stringify(pdr));
localStorage.setItem(`demo_pdr_${pdr.id}`, JSON.stringify(pdr));
```

---

**Check the console logs and localStorage to determine the actual PDR status, then we can decide if this is expected behavior or needs fixing!** 🔍
