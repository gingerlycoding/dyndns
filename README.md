# Dynamic DNS server

## What is this?
- Update DNS entries for the gingerlycoding.com domain
- Specifically pawnee.gingerlycoding.com and muncie.gingerlycoding.com, do not
  allow any other subdomains to be configured.


## Technical details
- Run on a Cloudflare Worker as dyndns.gingerlycoding.com
- accept a route dyndns.gingerlycoding.com/host/:id/?ip=:ip
- TODO double check what http verb this should accept, probably GET, POST, PUT
  for now just to cover all the bases.

## Use-case
- Ubiquiti Unifi gateways will be configured to update their dynamic dns
  hostname using this api endpoint
- Ultimately, wireguard VPN servers running on those gateways will use the
  hostnames instead of IPs since residential IPs are not static.
