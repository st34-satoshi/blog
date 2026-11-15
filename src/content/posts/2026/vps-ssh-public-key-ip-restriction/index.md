---
title: "VPSのSSHをパスワード認証から公開鍵認証に変更し、接続元IPを制限する"
slug: vps-ssh-public-key-ip-restriction
publishedAt: 2026-11-15T09:00:00+09:00
description: "UbuntuのVPSでSSHを公開鍵認証に切り替え、UFWで接続元IPを制限した手順。Macでの鍵作成から接続確認、復旧方法までまとめます。"
categories: [computer]
categoryIds: [37]
tags: []
draft: false
---

UbuntuのVPSで、SSHログインをパスワード認証から公開鍵認証に変更しました。さらに、SSHに接続できるIPアドレスを限定しました。

この記事では、作業手順と接続確認のポイントをまとめます。

## 前提

以下の環境を想定しています。

- 接続元：Mac
- VPS：Ubuntu 20.04 / 22.04
- SSHポート：22
- ファイアウォール：UFWがすでに有効で、受信の既定ポリシーがdenyまたはreject
- ログインユーザー：sudoを実行できるユーザー、またはroot

記事中の値は例です。自分の環境に置き換えてください。

| 項目 | 記事中の例 |
|---|---|
| VPSのIPアドレス | `203.0.113.10` |
| 接続元のグローバルIP | `198.51.100.20` |
| ログインユーザー | `example` |
| 秘密鍵のファイル名 | `id_ed25519_example_vps` |

IPアドレスには、説明用に予約されたアドレスを使っています。そのままでは接続できません。

## 作業の順番

締め出されないように、次の順番で進めます。

1. 現在の設定を確認する
2. MacでSSH鍵を作成する
3. VPSに公開鍵を登録する
4. 公開鍵だけで新規ログインできることを確認する
5. パスワード認証を無効化する
6. 接続元IPを制限する
7. 最後にもう一度、新規ログインを確認する

**作業中のSSH接続は、最後の接続確認が終わるまで閉じません。**

また、VPS事業者の管理画面からコンソールを使えることを、事前に確認しておきます。

## 1. VPSの現在の設定を確認する

ここからのコマンドは、SSH接続したVPS上で実行します。

### OSとユーザーを確認

```bash
cat /etc/os-release
id
```

登録されているユーザーも確認します。

```bash
getent passwd | awk -F: \
'{printf "%-20s UID=%-6s HOME=%-30s SHELL=%s\n", $1, $3, $6, $7}'
```

この一覧には、ログイン用ユーザーだけでなく、サービス用ユーザーも含まれます。シェルが`/bin/bash`などでも、SSH接続できるかどうかはSSH設定などに依存します。

### 現在の接続元とSSHポートを確認

```bash
printf '%s\n' "$SSH_CONNECTION"
```

次の順番で表示されます。

```text
接続元IP 接続元ポート VPSのIP SSHポート
```

### SSHの実効設定を確認

```bash
sudo /usr/sbin/sshd -T | grep -E \
'^(port|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|permitrootlogin|authorizedkeysfile|allowusers|allowgroups|denyusers|denygroups|authenticationmethods) '
```

設定ファイルも確認します。

```bash
sudo grep -nE \
'^[[:space:]]*(Include|Match|PasswordAuthentication|KbdInteractiveAuthentication|ChallengeResponseAuthentication|PubkeyAuthentication|PermitRootLogin|AuthenticationMethods|AllowUsers|AllowGroups)' \
/etc/ssh/sshd_config
```

```bash
sudo grep -RnE '^[[:space:]]*[^#[:space:]]' \
/etc/ssh/sshd_config.d/
```

今回の環境では、公開鍵認証とパスワード認証の両方が有効でした。また、環境によっては`50-cloud-init.conf`にもパスワード認証の設定がありました。

`Match`による条件別設定がある場合は、その内容も確認してから変更します。対象ユーザーと接続元について確認するには、次のように`-C`を指定します。値は実際の接続条件に置き換え、`Match Host`を使っている場合は`host`も指定してください。

```bash
sudo /usr/sbin/sshd -T \
  -C user=example,addr=198.51.100.20,laddr=203.0.113.10,lport=22
```

設定変更後も同じ条件で確認し、パスワード系認証が無効になっていることを確認します。

### ファイアウォールを確認

```bash
sudo ufw status verbose
```

今回の環境ではUFWが有効で、SSHは全IPから許可されていました。

SSHのルール名には、次の2パターンがありました。

```text
22/tcp              ALLOW IN    Anywhere
```

または、

```text
22/tcp (OpenSSH)    ALLOW IN    Anywhere
```

後で削除するときに使うコマンドが異なるため、確認しておきます。

## 2. MacでSSH鍵を作成する

ここからは、Macの新しいターミナルで実行します。

```bash
ssh-keygen -t ed25519 \
  -f ~/.ssh/id_ed25519_example_vps \
  -C "example-vps"
```

鍵を保護するため、パスフレーズを設定します。

次の2ファイルが作成されます。

| ファイル | 用途 |
|---|---|
| `~/.ssh/id_ed25519_example_vps` | 秘密鍵。Macに保管する |
| `~/.ssh/id_ed25519_example_vps.pub` | 公開鍵。VPSに登録する |

**秘密鍵はVPSに送ったり、他人に共有したりしません。**

同じ名前のファイルがすでに存在する場合は、上書きせず、別のファイル名にします。

## 3. VPSに公開鍵を登録する

Mac側で実行します。

```bash
cat ~/.ssh/id_ed25519_example_vps.pub | ssh example@203.0.113.10 \
'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys'
```

この段階では、VPSのログインパスワードを入力します。

公開鍵は`authorized_keys`に追記します。既存の鍵を消さないよう、`>`ではなく`>>`を使っています。

rootで接続している環境では、`example@`を`root@`に置き換えます。

## 4. 公開鍵だけで新規ログインする

Macの別ターミナルで実行します。

```bash
ssh -S none \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  -o PasswordAuthentication=no \
  -o KbdInteractiveAuthentication=no \
  -i ~/.ssh/id_ed25519_example_vps \
  example@203.0.113.10
```

このコマンドでは、既存のSSH接続を使い回さず、公開鍵認証での接続を確認します。SSH設定に別の`IdentityFile`がある場合はそれも候補になるため、鍵を厳密に確認したいときは`-v`を付けて認証ログも確認します。

次の表示は、秘密鍵のパスフレーズを求めています。VPSのログインパスワードとは別です。

```text
Enter passphrase for key ...
```

ログイン後、ユーザーと管理者権限を確認します。

```bash
whoami
sudo -v
```

sudoでユーザーパスワードを求められるのは正常です。SSHのパスワード認証を無効化しても、sudo用のパスワードはそのまま使えます。

rootの場合は、`whoami`で`root`と表示されることを確認します。

## 5. SSHのパスワード認証を無効化する

ここからはVPS側で実行します。

今回の環境では、`/etc/ssh/sshd_config`の冒頭付近に次の設定がありました。

```text
Include /etc/ssh/sshd_config.d/*.conf
```

そこで、専用の設定ファイルを追加しました。同名ファイルがすでにある場合は、先に内容を確認して保存しておきます。

```bash
sudo tee /etc/ssh/sshd_config.d/00-local-auth.conf > /dev/null <<'EOF'
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
```

各設定の意味は次のとおりです。

| 設定 | 意味 |
|---|---|
| `PubkeyAuthentication yes` | 公開鍵認証を有効にする |
| `PasswordAuthentication no` | パスワード認証を無効にする |
| `KbdInteractiveAuthentication no` | キーボード対話型認証を無効にする |
| `PermitRootLogin prohibit-password` | rootのパスワード系認証を禁止する |

rootの公開鍵ログインは許可したままです。rootのSSHログイン自体を禁止する設定ではありません。すでに`PermitRootLogin no`でrootログインを禁止している環境では、その設定を維持し、上の`PermitRootLogin prohibit-password`行は追加しません。

OpenSSHの多くの設定項目は、先に読み込まれた値が使われます。今回の構成では、`00-local-auth.conf`を`50-cloud-init.conf`より先に読み込ませます。

環境によって読み込み順や条件別設定が異なるため、ファイルを書くだけで終わらず、実効設定も確認します。

### 構文チェックと反映

```bash
sudo /usr/sbin/sshd -t && sudo systemctl reload ssh
```

構文チェックに成功した場合だけ、SSH設定を再読み込みします。エラーが出た場合は、その内容を修正してから進めます。

### 実効設定を確認

```bash
sudo /usr/sbin/sshd -T | grep -E \
'^(pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
```

今回の環境では、次のように表示されました。

```text
permitrootlogin without-password
pubkeyauthentication yes
passwordauthentication no
kbdinteractiveauthentication no
```

`without-password`は、ここでは`prohibit-password`と同じ意味です。

この変更は、条件別設定がなければ他のSSHユーザーにも適用されます。自動処理や他の利用者がいる場合も、鍵で接続できることを確認します。

### Macからもう一度、新規ログイン

```bash
ssh -S none \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  -i ~/.ssh/id_ed25519_example_vps \
  example@203.0.113.10
```

ログインできたことを確認してから、IP制限に進みます。

## 6. SSHの接続元IPを制限する

今回の環境ではUFWがすでに有効で、許可ルールのない外部からの接続を拒否する設定でした。

UFWが無効な環境では、Webサイトなどに必要な許可ルールを確認せずに有効化しないでください。

### 現在の接続元IPを確認

VPS側で実行します。

```bash
CLIENT_IP="${SSH_CONNECTION%% *}"
printf '許可するIP: %s\n' "$CLIENT_IP"
```

出力例：

```text
許可するIP: 198.51.100.20
```

空欄の場合は作業を止め、SSH接続したシェルで確認し直します。管理コンソール上では`SSH_CONNECTION`は通常設定されません。

これはVPSから見た接続元IPです。VPNや踏み台経由の場合は、その出口のIPになることがあります。

### 接続元IPを先に許可

```bash
sudo ufw allow from "$CLIENT_IP" to any port 22 proto tcp
```

### 全IP向けのSSH許可を削除

最初に確認したルール名に合わせて、以下のどちらかを実行します。

`22/tcp`として登録されている場合：

```bash
sudo ufw delete allow 22/tcp
```

`OpenSSH`として登録されている場合：

```bash
sudo ufw delete allow OpenSSH
```

両方のルールがある場合は、両方を削除します。

### 最終状態を確認

```bash
sudo ufw status verbose
```

SSHについて、次のように特定IPだけが許可されていることを確認します。

```text
22/tcp    ALLOW IN    198.51.100.20
```

次の全IP向けSSHルールが残っていないことも確認します。

- `Anywhere`
- `Anywhere (v6)`

SSHを含むポート範囲や、全ポートを許可するルールがあれば、それも確認します。IPv4だけを許可する場合は、IPv6経由のSSH接続はできなくなります。

Webサイト用の80・443番ポートは変更しません。

## 7. 最後に新規ログインを確認する

Macの別ターミナルから接続します。

```bash
ssh -S none \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  -i ~/.ssh/id_ed25519_example_vps \
  example@203.0.113.10
```

**既存の接続が使えることと、新規接続できることは別です。** 必ず新しい接続で確認します。

IP制限後もログインできれば、作業完了です。元のSSH接続を閉じて構いません。

```bash
exit
```

## 接続できなくなった場合

まだ開いているSSH接続、またはVPS管理画面のコンソールから、許可IPを確認・修正します。

どうしても一時的にSSHのIP制限を解除する必要がある場合は、次を実行します。

```bash
sudo ufw allow 22/tcp
```

**これは全IPからSSHに接続できる状態へ戻す復旧用コマンドです。正常に接続できた場合は実行しません。**

公開鍵認証の設定は維持されますが、IP制限は解除されるため、問題を解決したら全IP許可を再び削除します。

## 接続元IPが変わった場合

固定IPではない回線では、グローバルIPが変わることがあります。その場合は、VPS管理画面のコンソールなどから新しいIPを許可します。

```bash
sudo ufw allow from 新しい接続元IP to any port 22 proto tcp
```

新しいIPから接続できることを確認した後、古いIPの許可を削除します。

```bash
sudo ufw delete allow from 古い接続元IP to any port 22 proto tcp
```

IP制限を使う場合は、管理コンソールへのアクセス方法も把握しておくことが大切です。

## 作業後の状態

今回の変更で、次の状態になりました。

- SSHログインは公開鍵認証を使用
- SSHのパスワード認証は無効
- SSHへの接続元は指定したグローバルIPのみ
- Webサイト用のHTTP・HTTPSは引き続き公開

各段階で別ターミナルから接続を確認することで、締め出しを避けながら設定を変更できました。

## 参考資料

- [Ubuntu Server公式ドキュメント：OpenSSH server](https://ubuntu.com/server/docs/how-to/security/openssh-server/)
- [Ubuntu 20.04のsshd_configマニュアル](https://manpages.ubuntu.com/manpages/focal/man5/sshd_config.5.html)
- [Ubuntu Server公式ドキュメント：Firewall](https://ubuntu.com/server/docs/how-to/security/firewalls/)
