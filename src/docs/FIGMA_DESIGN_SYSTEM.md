# GAPT Figma Design System

This document serves as the Technical Specification for the **GAPT Figma Project**. Use these tokens to build the UI Library.

## 1. Color Primitives (Tokens)

| Token Name | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| **Surface-Deep** | `#020617` | Global Page Background |
| **Surface-Elevated** | `#0f172a` | Dashboard Layout Base |
| **Surface-Component** | `#1e293b` | Cards & Modals |
| **Primary-Indigo** | `#5d58ff` | Main CTA, Active States |
| **Success-Emerald** | `#10b981` | Approved Status, Attendance |
| **Danger-Rose** | `#f43f5e` | Revoked Status, Errors |
| **Text-Primary** | `#f8fafc` | Headings, High Emphasis |
| **Text-Muted** | `#64748b` | Sub-labels, Captions |

## 2. Typography (Inter)

- **H1 - Giant Display**: `3.75rem` / `Black 900` / `-0.05em` Tracking
- **H2 - Section Header**: `2.25rem` / `Black 900` / `-0.025em` Tracking
- **H3 - Card Title**: `1.25rem` / `Black 900` / `Tighter`
- **Body - Standard**: `0.875rem` / `Medium 500` / `Normal`
- **Label - Caps**: `0.625rem` / `Black 900` / `0.4em` Tracking (Uppercase)
- **Code - Mono**: `0.75rem` / `JetBrains Mono` / `Condensed`

## 3. Component Specs (Figma Components)

### **Dashboard Card**
- **Corner Radius**: `3rem` (48px)
- **Stroke**: `1px` Solid / `white / 5%`
- **Effect**: Inner Shadow + `3xl` Backdrop Blur
- **Padding**: `40px` (Default)

### **System Button (Primary)**
- **Height**: `64px`
- **Corner Radius**: `2rem` (32px)
- **Background**: `Primary-Indigo`
- **Shadow**: `0 20px 25px -5px rgba(93, 88, 255, 0.2)`

### **Input Field**
- **Height**: `56px`
- **Corner Radius**: `1.5rem` (24px)
- **Background**: `Surface-Deep`
- **Stroke**: `1px` / `#1e293b`

## 4. Layout Grid Settings
- **Desktop (1440px)**: 12 Columns / 32px Gutter / 80px Margin
- **Tablet (768px)**: 8 Columns / 24px Gutter / 40px Margin
- **Mobile (375px)**: 4 Columns / 16px Gutter / 20px Margin

## 5. Figma Page Structure
1. 💎 **Style Guide**: Colors, Type, Spacing
2. 🧩 **Components**: Buttons, Inputs, Cards, Nav
3. 🔐 **Auth Flow**: Login, Enrollment, Pending States
4. 🖥️ **Admin Console**: User Mgmt, Access Matrix, Site Settings
5. 🎓 **Student Portal**: Analytics, Leave, Materials
6. 👨‍🏫 **Staff Portal**: Mark Entry, Attendance, Leave Approval
