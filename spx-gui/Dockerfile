FROM nginx:stable

# Copy static assets from GitHub Actions runner
COPY dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
