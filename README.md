<div align="center">

# BrandSentinel AI

### AI-Powered Brand Integrity & Content Verification Platform

**Protecting Brand Identity. Ensuring Content Integrity.**

An AI-powered platform designed to help teams review marketing content,
identify potentially misleading claims, and maintain consistent brand communication.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Styling-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

<br/>

### 🌐 Live Demo

**[Launch BrandSentinel AI](https://brand-sentinel-ai-beta.vercel.app)**

**Developed by SOLONEX | Individual Hackathon Participant**

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [Technology Stack](#-technology-stack)
- [Application Architecture](#-application-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Security and Responsible AI](#-security-and-responsible-ai)
- [Limitations](#-limitations)
- [Future Enhancements](#-future-enhancements)
- [Deployment](#-deployment)
- [Author](#-author)
- [License](#-license)

---

## 🔍 Overview

BrandSentinel AI is an AI-powered brand content review platform built to help
individuals, marketing teams, and organizations evaluate their content before
publishing it.

The platform uses Google's Gemini AI to analyze submitted content and identify
potentially problematic claims, unsupported superlatives, exaggerated promises,
and language that may conflict with professional brand communication.

By combining AI-assisted analysis with persistent review history and analytics,
BrandSentinel AI provides a centralized workspace for examining content and
tracking review decisions.

### Mission

Help organizations communicate with greater confidence by making brand content
review more accessible, explainable, and consistent.

---

## ⚠️ Problem Statement

Marketing teams regularly create advertisements, product descriptions, social
media posts, promotional campaigns, and other customer-facing content.

However, reviewing this content can be challenging because:

- Exaggerated or absolute claims may create misleading impressions.
- Unsupported factual statements may require additional evidence.
- Inconsistent messaging can weaken brand identity.
- Manual review can become repetitive and time-consuming.
- Review decisions and historical findings can be difficult to track.
- Teams need a practical way to identify content that requires human attention.

These challenges create a need for an accessible tool that helps reviewers
identify potential content risks before publication.

---

## 💡 Our Solution

BrandSentinel AI provides an AI-assisted content review workflow.

Users submit marketing content, receive AI-generated analysis, review identified
findings, and maintain a history of previous reviews.

The platform combines:

- **AI-assisted content analysis** using Google Gemini.
- **Persistent data storage** using Supabase.
- **Review history** for accessing previously saved content.
- **Analytics** for monitoring reviews, findings, and review decisions.
- **A centralized dashboard** for navigating the application's features.

The goal is not to replace professional judgment. Instead, BrandSentinel AI helps
reviewers identify areas that deserve closer examination.

---

## ✨ Key Features

### 1. AI-Powered Content Analysis

Analyze submitted marketing content with Google's Gemini AI.

The analysis workflow helps identify potential concerns such as:

- Unsupported superlatives.
- Absolute or exaggerated promises.
- Potentially misleading statements.
- Claims requiring factual verification.
- Language that may undermine professional brand communication.

AI-generated findings are suggestions and should be verified before action.

### 2. Content Review Workspace

Submit content for analysis through a dedicated review interface.

The workspace is designed to make content submission and analysis straightforward.

### 3. Review Findings

Present analysis findings to help users understand which parts of their content
may require additional attention.

Findings support a more structured review process rather than relying only on
an overall AI-generated summary.

### 4. Review History

Save and retrieve previously analyzed content from Supabase.

The history interface allows users to revisit saved reviews and load their
content for further examination.

### 5. Analytics Dashboard

Monitor available application data through an analytics interface.

The dashboard includes metrics such as:

- Total saved reviews.
- Total recorded findings.
- High-priority findings.
- Claims requiring verification.
- Accepted, rejected, edited, and pending review decisions.
- Compliance scoring when valid scores are available.

Analytics reflect the records returned by the application's database APIs.

### 6. Persistent Database Integration

Use Supabase PostgreSQL to store review-related information and retrieve
previously saved records.

### 7. Cloud Deployment

Deploy the application through Vercel and connect it to a GitHub repository
for version control and future updates.

---

## 🔄 How It Works

```text
       ┌─────────────────────────┐
       │       User submits      │
       │     marketing content   │
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │     Next.js Application │
       │    Review Interface     │
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │     Gemini AI API       │
       │   Content Examination   │
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │   Analysis Summary      │
       │   and Review Findings   │
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │   Supabase Database     │
       │  Saved Review Records   │
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │  Review History and     │
       │  Analytics Dashboard    │
       └─────────────────────────┘
