## ssh

- 1. 生成密钥（一路回车）
ssh-keygen -t ed25519 -C "349057996@qq.com"

- 2. 复制公钥
cat ~/.ssh/id_ed25519.pub

- 3. GitHub → Settings → SSH and GPG keys → New SSH key，粘贴公钥

- 4. 把远程地址换成 SSH 形式
git remote set-url origin git@github.com:best-time/vue-work.git

- 5. 推送
git push -u origin main
