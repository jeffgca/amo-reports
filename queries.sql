SELECT addons.id, addons.guid, files.jetpack_version
FROM addons 
INNER JOIN versions ON versions.addon_id = addons.id 
INNER JOIN files ON versions.id = files.version_id 
WHERE addons.created = versions.created
AND addons.guid LIKE 'jid%';

SELECT addons.id, addons.guid, files.jetpack_version
FROM addons 
INNER JOIN versions ON versions.addon_id = addons.id 
INNER JOIN files ON versions.id = files.version_id 
WHERE addons.created = versions.created
AND files.jetpack_version IS NOT NULL;

-- builder?
SELECT addons.id, addons.guid, addons.slug, 
versions.id, addons.created,  files.created
FROM addons 
INNER JOIN versions ON versions.addon_id = addons.id 
INNER JOIN files ON versions.id = files.version_id 
AND files.platform_id = 1 
AND addons.guid LIKE 'jid%'
AND files.jetpack_version IS NULL
AND versions.id = addons.current_version;

-- need tag-based query?
SELECT a.id as addon_id, v.id as verison_id, f.filename
FROM `users_tags_addons` as uta 
INNER JOIN `addons` as a ON uta.addon_id = a.id 
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE `tag_id` = 7758
AND v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10) ;


-- crazy query, gets all users associated with addons that have been updated 
-- since 2011-01-01

SELECT users.id, a.id, v.id, a.slug, users.`display_name` FROM `users`
INNER JOIN addons_users ON users.`id` = addons_users.`user_id`
INNER JOIN addons as a ON addons_users.`addon_id` = a.id
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE DATE(v.`created`) > '2010-12-31' 
AND v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10);

-- gets all users that have uploaded a currently active add-on since 2011-01-01
SELECT DISTINCT(fu.user_id), u.`display_name`, u.email FROM file_uploads fu
INNER JOIN users as u ON u.`id` = fu.`user_id`
INNER JOIN addons_users as au ON au.`user_id` = u.id
INNER JOIN `addons` as a ON au.`addon_id` = a.`id`
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE DATE(v.`created`) > '2010-12-31' 
AND v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10);

-- same as above, but only with add-ons tagged 'jetpack'
SELECT DISTINCT(fu.user_id), u.`display_name`, u.email
FROM file_uploads fu
INNER JOIN users as u ON u.`id` = fu.`user_id`
INNER JOIN addons_users as au ON au.`user_id` = u.id
INNER JOIN `addons` as a ON au.`addon_id` = a.`id`
INNER JOIN `users_tags_addons` as uta ON uta.`addon_id` = a.id
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE DATE(v.`created`) > '2010-12-31' 
AND `tag_id` = 7758
AND v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10);

-- similar, gets definite builder-built add-ons
SELECT DISTINCT(fu.user_id), u.`display_name`, u.email
FROM file_uploads fu
INNER JOIN users as u ON u.`id` = fu.`user_id`
INNER JOIN addons_users as au ON au.`user_id` = u.id
INNER JOIN `addons` as a ON au.`addon_id` = a.`id`
INNER JOIN `users_tags_addons` as uta ON uta.`addon_id` = a.id
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE DATE(v.`created`) > '2010-12-31' 
AND `tag_id` = 7758
AND a.guid LIKE 'jid0%'
AND v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10);

-- number of addons with x many users.
SELECT COUNT(DISTINCT(a.id))
FROM addons a
INNER JOIN `users_tags_addons` as uta ON uta.`addon_id` = a.id
INNER JOIN `versions` as v ON v.addon_id = a.id
-- INNER JOIN `files` as f ON f.version_id = v.id
-- WHERE DATE(v.`created`) > '2010-12-31' 
WHERE `tag_id` = 7758
AND a.guid LIKE 'jid0%'
AND v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10)
AND a.average_daily_users > 10000


-- jetpack older versions
SELECT DISTINCT(a.id), a.slug, u.email, f.jetpack_version
FROM file_uploads fu
INNER JOIN users as u ON u.`id` = fu.`user_id`
INNER JOIN addons_users as au ON au.`user_id` = u.id
INNER JOIN `addons` as a ON au.`addon_id` = a.`id`
INNER JOIN `users_tags_addons` as uta ON uta.`addon_id` = a.id
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE DATE(v.`created`) > '2010-12-31' 
AND `tag_id` = 7758
AND v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10)
AND f.jetpack_version NOT IN ( '1.10', '1.11', '1.12', '1.13', '1.13.2' );


-- re-pack query
SELECT DISTINCT(a.id), a.average_daily_users, a.slug, f.id, f.created, f.filename, f.jetpack_version
FROM addons a
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10)
AND f.jetpack_version NOT IN ( '1.12', '1.13' )
ORDER BY a.average_daily_users DESC


-- bholley query
SELECT DISTINCT(a.id), a.average_daily_users, a.slug, f.id, f.created, f.filename, f.jetpack_version
FROM addons a
INNER JOIN `versions` as v ON v.addon_id = a.id
INNER JOIN `files` as f ON f.version_id = v.id
WHERE v.`id` = a.`current_version`
AND a.inactive = 0 
AND a.status NOT IN (0, 5,10)
AND f.jetpack_version NOT IN ( '1.9', '1.10', '1.11', '1.12', '1.13' )
ORDER BY a.average_daily_users DESC

