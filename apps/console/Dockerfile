FROM public.ecr.aws/lambda/nodejs:22

# Set working directory to /var/task/
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy .output/server directory contents to /var/task/
COPY . .

# Lambda function handler
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["index.handler"]