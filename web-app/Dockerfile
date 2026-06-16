FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css login.js config.js /usr/share/nginx/html/
EXPOSE 8000
CMD ["nginx", "-g", "daemon off;"]
