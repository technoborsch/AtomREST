# syntax=docker/dockerfile:1
FROM python:3.9-alpine
ENV PYTHONUNBUFFERED=1
WORKDIR /code
COPY requirements.txt /code/
RUN set -ex \
    && apk add --no-cache --virtual .build-deps postgresql-dev build-base \
    && python -m venv /env \
    && /env/bin/pip install --upgrade pip \
    && /env/bin/pip install --no-cache-dir -r /code/requirements.txt \
    && runDeps="$(scanelf --needed --nobanner --recursive /env \
        | awk '{ gsub(/,/, "\nso:", $2); print "so:" $2 }' \
        | sort -u \
        | xargs -r apk info --installed \
        | sort -u)" \
    && apk add --virtual rundeps $runDeps \
    && apk del .build-deps
COPY . /code/
WORKDIR /code
RUN rm -r .vs; \
    rm -r htmlcov;  \
    rm -r venv;  \
    rm .coverage;  \
    rm .gitignore;  \
    rm docker-compose.yml; \
    rm Dockerfile; \
    rm LICENCE; \
    rm README.md; \
    rm -r EasyView/static; \
    rm -r staticfiles/threejs/examples/textures; \
    rm -r staticfiles/threejs/docs; \
    rm -r staticfiles/threejs/test

ENV VIRTUAL_ENV /env
ENV PATH /env/bin:$PATH

EXPOSE 8000

CMD ["sh", "-c", "python manage.py makemigrations; python manage.py migrate; gunicorn --bind :8000 AtomREST.wsgi --timeout=60"]