define({
    /* CC0. Account counts for Vue 3, fetched through the webroot session helper. */
    data: function() { return { notificationCount:0, messageCount:0, eventCount:0, taskCount:0, updateInterval:null, updateErrors:0 } },
    template:
        '<div class="my-account-nav">' +
            '<m-link href="/apps/my/User/Task/MyTasks" title="Open Tasks"><i class="fa fa-check"></i> {{taskCount}}</m-link> ' +
            '<m-link href="/apps/my/User/Calendar/MyCalendar" title="Events This Week"><i class="fa fa-calendar"></i> {{eventCount}}</m-link> ' +
            '<m-link href="/apps/my/User/Messages/FindMessage?statusId=CeReceived&toCurrentUser=true" title="Messages"><i class="fa fa-envelope"></i> {{messageCount}}</m-link> ' +
            '<m-link href="/apps/my/User/Notifications" title="Notifications"><i class="fa fa-info-circle"></i> {{notificationCount}}</m-link>' +
        '</div>',
    methods: {
        updateCounts: function() {
            if (Date.now() - this.$root.lastNavTime > 10*60*60*1000) {
                clearInterval(this.updateInterval); this.updateInterval = null; return;
            }
            if (this.countRequest) this.countRequest.abort();
            this.countRequest = new AbortController();
            return moqui.request(this.$root.appRootPath + '/rest/s1/mantle/my/noticeCounts', {signal:this.countRequest.signal}).then(result => {
                if (!result.json) throw new Error('Invalid notice counts response');
                for (const key of ['notificationCount', 'messageCount', 'eventCount', 'taskCount']) this[key] = Number(result.json[key] || 0);
                this.updateErrors = 0;
            }).catch(error => {
                if (error.aborted) return;
                console.error('Load account notice counts', error);
                if (++this.updateErrors >= 5) { clearInterval(this.updateInterval); this.updateInterval = null; }
            });
        },
        notificationListener: function(jsonObj) {
            if (jsonObj && jsonObj.persistOnSend === true) this.notificationCount++;
        }
    },
    mounted: function() {
        this.updateCounts();
        this.updateInterval = setInterval(this.updateCounts, 5*60*1000);
        if (this.$root.notificationClient) this.$root.notificationClient.registerListener('ALL', this.notificationListener);
    },
    beforeUnmount: function() {
        clearInterval(this.updateInterval);
        if (this.countRequest) this.countRequest.abort();
        const client = this.$root.notificationClient;
        const listeners = client && client.topicListeners.ALL;
        if (listeners) { const i = listeners.indexOf(this.notificationListener); if (i >= 0) listeners.splice(i, 1); }
    }
});
