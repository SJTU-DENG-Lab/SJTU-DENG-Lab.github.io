# [SJTU-DENG-Lab.github.io](https://SJTU-DENG-Lab.github.io/)

This git repo hosts all content displayed on the website of DENG Lab @ SJTU.


## How to build

1. Install Hugo > 0.12
2. Run the following commands:

```bash
git clone https://github.com/SJTU-DENG-Lab/SJTU-DENG-Lab.github.io.git
cd SJTU-DENG-Lab.github.io
hugo server
```


## How to generate publication list

1. Copy the latest publication json to the root folder.
2. Run the following
```bash
python gen_publications.py
```
3. Copy the output of this script to `content/publications.md`
