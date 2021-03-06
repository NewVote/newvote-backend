FROM node:6.10.3

# Install gem sass for  grunt-contrib-sass
RUN apt-get update -qq && apt-get install -y build-essential
RUN apt-get install -y ruby
RUN apt-get install -y ruby-dev
RUN gem update --system
RUN gem install sass

WORKDIR /home/mean

# Install Mean.JS Prerequisites
# RUN npm install -g grunt-cli
RUN npm install -g bower
RUN npm install -g gulp
RUN npm install -g gulp-cli

# Install Mean.JS packages
ADD package.json /home/mean/package.json
RUN npm install

# Manually trigger bower. Why doesnt this work via npm install?
ADD .bowerrc /home/mean/.bowerrc
ADD bower.json /home/mean/bower.json
RUN bower install --config.interactive=false --allow-root

# Make everything available for start
ADD . /home/mean

# Set development environment as default
ENV NODE_ENV production

# Port 3000 for server
# Port 35729 for livereload
EXPOSE 80 8443
CMD ["sh", "-c", "gulp prod"]
