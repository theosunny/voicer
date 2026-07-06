package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

type OSSClient struct {
	bucket *oss.Bucket
	region string
	name   string
}

func NewOSSClient(keyID, keySecret, region, bucketName string) (*OSSClient, error) {
	endpoint := fmt.Sprintf("https://oss-%s.aliyuncs.com", region)
	client, err := oss.New(endpoint, keyID, keySecret)
	if err != nil {
		return nil, err
	}
	bucket, err := client.Bucket(bucketName)
	if err != nil {
		return nil, err
	}
	return &OSSClient{bucket: bucket, region: region, name: bucketName}, nil
}

// Upload puts an object at key from reader. Returns the public URL.
func (o *OSSClient) Upload(_ context.Context, key string, reader io.Reader) (string, error) {
	if err := o.bucket.PutObject(key, reader); err != nil {
		return "", err
	}
	return fmt.Sprintf("https://%s.oss-%s.aliyuncs.com/%s", o.name, o.region, key), nil
}

// Download returns a reader for the object at key.
func (o *OSSClient) Download(_ context.Context, key string) (io.ReadCloser, error) {
	result, err := o.bucket.GetObject(key)
	if err != nil {
		return nil, err
	}
	return result, nil
}
