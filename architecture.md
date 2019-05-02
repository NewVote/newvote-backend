# NewVote Architecture

This document outlines the basics of NewVote Architecture.

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Client](#client)
	- [Web](#web)
	- [Web - planned](#web-planned)
	- [Mobile - planned](#mobile-planned)
	- [Current Deployment](#web-current-deployment)
- [Server](#server)
	- [Core (API gateway)](#core)
	- [Persistence](#persistence)
	- [Authentication](#authentication)
	- [Verification](#verification)
	- [Current Deployment](#current-deployment)

<!-- /TOC -->


## Client
The web client (newvote-frontend) is an Angular SPA, which communicates with the server via https CRUD endpoints.

### Web
- Angular 7
- Responsive
- Material design
- Deployed through AWS CloudFront

### Web - planned
- Websockets
- Service workers / better caching for offline use
- Pol.is integration
- Wiki-like editing
- Internationalization (translations)

### Mobile
- Responsive website

### Mobile - planned
- Native apps (nativescript/react-native)
- Push notifications

### Web Current Deployment
- Web app stored on S3 Bucket (AWS)
- Web app distributed via CloudFront (AWS)

## Server
Server is the backend portion of the original MEAN deployment. Comprised of a single monolith Node.js app. The server exposes a RESTful API for data exchange and authenticates via JSON web tokens.

### Core
- Handles all http requests using express
- Business logic written in ES6 modules

## Persistence
- MongoDB is used to store all application data
- Cloudinary for image upload and caching

## Authentication
- Passport.js express middleware using local strategy
- HTTP requests to API gateway authenticated via JWT issued by the User Service to the client after successful OAuth with above provider
- Token is stored by client in local storage and passed as request header with API requests

## Verification
- SMS Broadcast used to verify mobile phone numbers

## Current Deployment
- Hosted on Heroku web dyno
- MongoDB from mLab
- Cloudinary for image hosting
- Webpack for build/deploy
- Sendmail for emails
- SMSBroadcast for SMS messages
- Github for public repository (heroku updates from master)
