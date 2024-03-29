# Guardian

# Setting up the PKC to support Guardian
1. Install https://www.mediawiki.org/wiki/Extension:OAuth
1. In LocalSettings.php, add
   ```
   $wgGroupPermissions['sysop']['mwoauthproposeconsumer'] = true;
   $wgGroupPermissions['sysop']['mwoauthupdateownconsumer'] = true;
   ```
1. Inside the PKC MediaWiki Docker (inside /var/www/html) run
   `openssl genrsa -out private.key 4096 && openssl rsa -in private.key -pubout -out public.key`
   , change the ownership of both keys to www-data:www-data, and change the
   permission of public.key using `chmod 600 public.key`
   (TODO: need better algorithm than `rsa`, but the one that is supported by
   JWT)
1. In LocalSettings.php, add
   ```
   $wgOAuth2PrivateKey = "/var/www/html/private.key";
   $wgOAuth2PublicKey = "/var/www/html/public.key";
   ```
1. In the PKC MediaWiki Docker, run `php resetUserEmail.php  <username>
   foo@bar.com --dbuser <db username> --dbpass <db password>`. We need to do
   this because the following step requires the user to have an email account
   in their user profile. Since we have opted to use MetaMask login
   exclusively, we can no longer use Special:UserLogin.
1. Go to the special page Special:OAuthConsumerRegistration/propose and create
   an OAuth application. Make sure to choose OAuth2.
   Make sure to enable these privileges
   * Import revisions
   * Edit the MediaWiki namespace and sitewide/user JSON
   * Create, edit, and move pages
   * Upload, replace, and move files
   * Rollback changes to pages
   * View deleted files and pages
   * Delete pages, revisions, and log entries
   * Create accounts
   Make sure to DISABLE "This consumer is for use only by <wallet address>".
   Specify the callback URL, e.g. http://localhost:8047/callback
1. Edit index.js to set the client id/secret from the previous step.

Note: we are required to generate and set up the private/public key manually
due to this bug: https://github.com/thephpleague/oauth2-server/issues/1240.
What's worse is that this is not well documented
https://phabricator.wikimedia.org/T264514 even though MediaWiki docs keep
recommending people to use OAuth2 for their API authentication.
