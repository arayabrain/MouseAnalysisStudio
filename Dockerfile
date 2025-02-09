FROM --platform=linux/amd64 python:3.8.16-slim

WORKDIR /app

COPY requirements.txt .

RUN mkdir -p /root/miniconda3 && \
    apt-get --allow-releaseinfo-change update && \
    apt-get install --no-install-recommends -y wget && \
    wget -q https://repo.anaconda.com/miniconda/Miniconda3-py39_4.12.0-Linux-x86_64.sh -O ~/miniconda3/miniconda.sh && \
    apt-get purge wget -y && apt-get autoremove -y && apt-get clean && \
    bash /root/miniconda3/miniconda.sh -b -u -p /root/miniconda3 && \
    rm /root/miniconda3/miniconda.sh && \
    export PATH="$PATH:/root/miniconda3/bin" && \
    conda upgrade -y --all && \
    conda config --set channel_priority strict && \
    conda clean -y --tarballs

ENV PATH $PATH:/root/miniconda3/bin

RUN pip install --no-cache-dir -r requirements.txt

COPY optinist ./optinist

COPY backend ./backend

COPY frontend/build ./frontend/build

COPY sample_data ./sample_data

COPY main.py firebase_config.json firebase_private.json .env ./

EXPOSE 8000
